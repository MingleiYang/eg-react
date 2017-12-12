/**
 * Web worker for FeatureSource.  Stores a single instance of the FeatureSourceWorker class per thread.  For additional
 * details, see the doc for FeatureSourceWorker.
 * 
 * @author Silas Hsu
 */
import DisplayedRegionModel from '../model/DisplayedRegionModel';
import makeBamIndex from '../vendor/igv/BamIndex';
import unbgzf from '../vendor/igv/bgzf';

if (process.env.NODE_ENV !== "test") {
    importScripts('js/zlib_and_gzip.min.js');
}
const registerPromiseWorker = require('promise-worker/register');

var theWorker = null;

const MAX_GZIP_BLOCK_SIZE = 1 << 16;

/**
 * Perform a network request for binary data.
 * 
 * @param {string} url - url from which to request data.
 * @param {Object} range - object with number keys `start` and `end`.  Range of bytes to request.
 * @return {Promise<ArrayBuffer>} Promise for binary data from the url
 */
function requestBinary(url, range) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.responseType = "arraybuffer";
        xhr.onload = (event) => {
            if (xhr.status >= 400) {
                reject(xhr.response);
            } else {
                resolve(xhr.response);
            }
        };
        xhr.onerror = reject;
        xhr.open('GET', url);
        if (range) {
            xhr.setRequestHeader("Range", `bytes=${range.start}-${range.end}`);
        }
        xhr.send();
    });
}

/**
 * Representation of a feature/line in a bed file.
 * 
 * @typedef {Object} BedFeature
 * @property {string} chr - chromosome
 * @property {number} start - start base number in the chromosome
 * @property {number} end - end base number in the chromosome
 * @property {string} details - fourth column in the data; can contain anything
 */

/**
 * Class containing functions that (1) get, parse, and cache the index file for a bed (or bed-like) file; and (2) unzip
 * and parse a requested region of the bed file by using the index.  Code is based off of IGV.
 */
class FeatureSourceWorker {
    /**
     * Prepares to fetch data from a bed file located at the input url.  Assumes the index is located at the same url,
     * plus a file extension of ".tbi".  This method will request and store the tabix index from this url immediately.
     * 
     * @param {string} url - the url of the bed-like file to fetch.
     */
    constructor(url) {
        this.url = url;
        this.indexPromise = requestBinary(url + '.tbi').then((rawData) => { // rawData is an ArrayBuffer
            let decompressor = new Zlib.Gunzip(new Uint8Array(rawData));
            let decompressed = decompressor.decompress();
            return makeBamIndex(decompressed.buffer, true);
        });
    }

    /**
     * Gets data lying within the regions.
     * 
     * @param {Object} regions - the regions for which to get data
     * @return {Promise<BedFeature[]>} Promise for the data
     */
    async getData(regions) {
        if (!regions) {
            return [];
        }

        await this.indexPromise;
        let requests = [];
        for (let chrInterval of regions) {
            requests.push(this._getFeatures(chrInterval.name, chrInterval.start, chrInterval.end));
        }

        // Concatenate all the data into one array
        return Promise.all(requests).then(results => [].concat.apply([], results));
    }

    /**
     * Gets data for a single chromosome interval.
     * 
     * @param {string} chromosome - the chromosome for which to fetch data
     * @param {number} start - the start base pair of the interval
     * @param {number} end - the end base pair of the interval
     * @return {Promise<BedFeature[]>} Promise for the data
     */
    async _getFeatures(chromosome, start, end) {
        const index = await this.indexPromise;
        const refId = index.sequenceIndexMap[chromosome];
        const blocks = index.blocksForRange(refId, start, end);
        if (!blocks) {
            return [];
        }

        let featuresForEachBlock = [];
        for (let block of blocks) {
            const startByte = block.minv.block;
            const startOffset = block.minv.offset;
            const endByte = block.maxv.block + MAX_GZIP_BLOCK_SIZE;

            const rawData = await requestBinary(this.url, {start: startByte, end: endByte});
            const uncompressed = unbgzf(rawData);
            const slicedData = startOffset > 0 ? uncompressed.slice(startOffset) : uncompressed;
            featuresForEachBlock.push(this._parseAndFilterFeatures(slicedData, chromosome, start, end));
        }
        return [].concat.apply([], featuresForEachBlock); // Combine all of the features into one array
    }

    /**
     * The data initially comes in as a large, binary blob.  This decodes the blob into text, parses the features, and
     * filters out those features outside of the interval we want.
     * 
     * @param {ArrayBuffer} buffer - raw blob of text from the bed-like file
     * @param {string} chromosome - the chromosome for which to fetch data
     * @param {number} start - the start base pair of the interval
     * @param {number} end - the end base pair of the interval
     */
    _parseAndFilterFeatures(buffer, chromosome, start, end) {
        const text = new TextDecoder('utf-8').decode(buffer);
        const lines = text.split('\n');

        let features = [];
        for (let line of lines) {
            const columns = line.split('\t');
            if (columns.length < 4) {
                continue;
            }
            if (columns[0] !== chromosome) {
                continue;
            }
            
            const feature = {
                chr: columns[0],
                start: Number.parseInt(columns[1]),
                end: Number.parseInt(columns[2]),
                details: columns[3]
            }
            if (feature.start > end) { // This is correct as long as the features are sorted by start
                break;
            }
            if (feature.end >= start && feature.start <= end) {
                features.push(feature);
            }
        }

        return features;
    }
}

 /**
  * Respond to a postMessage call from the thread that created this worker.  Creates a instance of FeatureSourceWorker
  * if one does not already exist, and then uses it to return a Promise for data.
  *
  * @param {Object} messageObj - object passed from postMessage
  * @return {Promise<Object[]>} data that the message requested
  */
function respondToMessage(messageObj) {
    if (messageObj.url) {
        theWorker = new FeatureSourceWorker(messageObj.url);
    }

    return theWorker.getData(messageObj.regions);
}

// Specified by promise-worker (https://github.com/nolanlawson/promise-worker#message-format).
registerPromiseWorker(respondToMessage);