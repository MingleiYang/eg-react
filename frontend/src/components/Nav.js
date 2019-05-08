import React from "react";
import PropTypes from 'prop-types';
import ReactModal from "react-modal";
import _ from "lodash";
import { connect } from 'react-redux';
import {RadioGroup, Radio} from 'react-radio-group';
import { ActionCreators } from '../AppState';
import DisplayedRegionModel from '../model/DisplayedRegionModel';
import { getSpeciesInfo, allGenomes } from "../model/genomes/allGenomes";
import TrackRegionController from './genomeNavigator/TrackRegionController';
import RegionSetSelector from './RegionSetSelector';
import Geneplot from './Geneplot/Geneplot';
import TrackList from "./trackManagers/TrackList";
import { TrackModel } from '../model/TrackModel';
import { AnnotationTrackUI } from './trackManagers/AnnotationTrackUI';
import HubPane from './trackManagers/HubPane'
import CustomTrackAdder from './trackManagers/CustomTrackAdder';
import { SessionUI } from "./SessionUI";
import LiveUI from "./LiveUI";
import { RegionExpander } from '../model/RegionExpander';
import { ScreenshotUI } from "./ScreenshotUI";
import FacetTableUI from "./FacetTableUI";
import { STORAGE, SESSION_KEY, NO_SAVE_SESSION } from "../AppState";
import { HotKeyInfo } from "./HotKeyInfo";
import { INTERACTION_TYPES } from "./trackConfig/getTrackConfig";
import { TrackUpload } from "./TrackUpload";
import { FetchSequence } from "./FetchSequence";
import packageJson from '../../package.json';
import ScatterPlot from "./Geneplot/ScatterPlot";
import ColorPicker from "./ColorPicker";

import './Nav.css';

const REGION_EXPANDER1 = new RegionExpander(1);
const REGION_EXPANDER0 = new RegionExpander(0);

const callbacks = { onGenomeSelected: ActionCreators.setGenome };

/**
 * the top navigation bar for browser
 * @author Daofeng Li
 */
class Nav extends React.Component {
    static propTypes = {
        selectedRegion: PropTypes.instanceOf(DisplayedRegionModel).isRequired,
        onRegionSelected: PropTypes.func,
        tracks: PropTypes.arrayOf(PropTypes.instanceOf(TrackModel)),
        genomeConfig: PropTypes.object.isRequired,
        onTracksAdded: PropTypes.func,
        onTrackRemoved: PropTypes.func,
        trackLegendWidth: PropTypes.number,
        onLegendWidthChange: PropTypes.func,
        onSetHighlightColor: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.state = {
            isCacheEnabled: true,
            genomeModal: false,
            otherGenome: null,
        };
        this.debounced = _.debounce(this.props.onLegendWidthChange, 250);
        this.renderOtherGenomes = this.renderOtherGenomes.bind(this);
        this.handleOtherGenomeChange = this.handleOtherGenomeChange.bind(this);
    }
    
    componentDidMount(){
        this.enableCache();
    }

    handleGenomeOpenModal  = () => {
        this.setState({ genomeModal: true });
    }
      
    handleGenomeCloseModal = () => {
        this.setState({ genomeModal: false });
    }

    changeLegendWidth = (e) => {
        const width = Number.parseFloat(e.currentTarget.value);
        //const debounced = _.debounce(this.props.onLegendWidthChange, 250);
        if (width >= 60 && width <= 200) {
            //this.props.onLegendWidthChange(width);
            this.debounced(width);
        }
    }

    disableCache = () => {
        STORAGE.removeItem(SESSION_KEY);
        STORAGE.setItem(NO_SAVE_SESSION, 1);
    }

    enableCache = () => {
        STORAGE.removeItem(NO_SAVE_SESSION);
    }

    toggleCache = () => {
        if (this.state.isCacheEnabled) {
            this.disableCache();
            this.setState({isCacheEnabled: false});
        } else {
            this.enableCache();
            this.setState({isCacheEnabled: true});
        }
    };

    handleOtherGenomeChange (value) {
        this.setState({otherGenome: value});
    }

    renderOtherGenomes() {
        const genomeName = this.props.genomeConfig.genome.getName();
        const otherGenomes = allGenomes.map(g => g.genome.getName()).filter(g => g !== genomeName);
        const radios = otherGenomes.map(g => {
            const {name} = getSpeciesInfo(g);
            return <label key={g}><Radio value={g} /> {name} {g}</label>
        })
        return (
            <RadioGroup
              name="otherGenome"
              selectedValue={this.state.otherGenome}
              onChange={this.handleOtherGenomeChange}
              style={{display: "grid"}}
            >
              {radios}
            </RadioGroup>
          );
    }

    changeGenome = () => {
        this.props.onGenomeSelected(this.state.otherGenome);
        this.setState({otherGenome: null, genomeModal: false});
    }

    render() {
        const {
            tracks, genomeConfig, onTracksAdded, onTrackRemoved, selectedRegion, onRegionSelected,
            isShowingNavigator, onToggleNavigator, isShowing3D, onToggle3DScene, bundleId,
            onToggleHighlight, onSetEnteredRegion, highlightEnteredRegion, trackLegendWidth,
            onAddTracksToPool, publicTracksPool, customTracksPool, onHubUpdated, publicHubs,
            publicTrackSets, customTrackSets, addedTrackSets, addTracktoAvailable, removeTrackFromAvailable,
            availableTrackSets, addTermToMetaSets, onSetHighlightColor, highlightColor
        } = this.props;
        const genomeName = genomeConfig.genome.getName();
        const {name, logo, color} = getSpeciesInfo(genomeName);
        const hasInteractionTrack = tracks.some(model => INTERACTION_TYPES.includes(model.type)) ? true : false;
        const REGION_EXPANDER = hasInteractionTrack ? REGION_EXPANDER1 : REGION_EXPANDER0;
        const {genomeModal, otherGenome} = this.state;
        return (
            <div className="Nav-container">
                <div id="logoDiv">
                    <img src="https://epigenomegateway.wustl.edu/images/eglogo.jpg" width="180px" height="30px" alt="browser logo"/>
                    {/* <span id="theNew" >The New</span> */}
                    <span id="theVersion">v{packageJson.version}</span>
                </div>
                <div className="Nav-genome Nav-center" 
                    style={{backgroundImage: `url(${logo})`, color: color, backgroundSize: "cover"}}>
                    <div onClick={this.handleGenomeOpenModal}><span style={{textTransform: 'capitalize'}}>{name}</span> {genomeName}</div>
                    <ReactModal 
                        isOpen={genomeModal}
                        ariaHideApp={false}
                        contentLabel="genomeModal"
                        onRequestClose={this.handleGenomeCloseModal}
                        shouldCloseOnOverlayClick={true}
                        style={{content: {
                                right: "unset",
                                bottom: "unset",
                                top: 0,
                                left: 0,
                                height: "100%",
                            },
                            overlay: {
                                backgroundColor: 'rgba(111,107,101, 0.7)'}
                            }
                        }
                    >
                        {this.renderOtherGenomes()}
                        <button className="btn btn-sm btn-danger" onClick={this.handleGenomeCloseModal}>Close</button>
                        {' '}
                        {otherGenome && 
                            <button className="btn btn-sm btn-primary" onClick={this.changeGenome} >Go</button>
                        }
                    </ReactModal>
                </div>
                <div className="Nav-center">
                    <TrackRegionController
                        selectedRegion={selectedRegion}
                        onRegionSelected={onRegionSelected}
                        onToggleHighlight={onToggleHighlight}
                        onSetEnteredRegion={onSetEnteredRegion}
                    />
                </div>
                {/* <div className="Nav-center">
                    <ZoomButtons viewRegion={selectedRegion} onNewRegion={onRegionSelected} />
                </div> */}
                <div className="Nav-center btn-group">
                    <DropdownOpener extraClassName="btn-primary" label="🎹Tracks" />
                    <div className="dropdown-menu">
                        <ModalMenuItem itemLabel="Annotation Tracks">
                            <AnnotationTrackUI
                                addedTracks={tracks}
                                onTracksAdded={onTracksAdded}
                                addedTrackSets={addedTrackSets}
                                genomeConfig={genomeConfig}
                            />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Public Data Hubs">
                            <HubPane 
                                addedTracks={tracks} 
                                onTracksAdded={onTracksAdded} 
                                onTrackRemoved={onTrackRemoved}
                                onAddTracksToPool={onAddTracksToPool}
                                publicTracksPool={publicTracksPool}
                                publicHubs={publicHubs}
                                onHubUpdated={onHubUpdated}
                                publicTrackSets={publicTrackSets}
                                addedTrackSets={addedTrackSets}
                                addTermToMetaSets={addTermToMetaSets}
                            />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Track Facet Table">
                            <FacetTableUI 
                                publicTracksPool={publicTracksPool}
                                customTracksPool={customTracksPool}
                                addedTracks={tracks} 
                                onTracksAdded={onTracksAdded}
                                publicTrackSets={publicTrackSets}
                                customTrackSets={customTrackSets}
                                addedTrackSets={addedTrackSets}
                                addTermToMetaSets={addTermToMetaSets}
                            />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Custom Tracks">
                            <CustomTrackAdder 
                                addedTracks={tracks} 
                                onTracksAdded={onTracksAdded} 
                                onTrackRemoved={onTrackRemoved} 
                                onAddTracksToPool={onAddTracksToPool}
                                customTracksPool={customTracksPool}
                                customTrackSets={customTrackSets}
                                addedTrackSets={addedTrackSets}
                                addTermToMetaSets={addTermToMetaSets}
                            />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Track List">
                            <TrackList 
                                addedTracks={tracks} 
                                onTracksAdded={onTracksAdded} 
                                onTrackRemoved={onTrackRemoved}
                                addedTrackSets={addedTrackSets}
                                availableTrackSets={availableTrackSets}
                                addTracktoAvailable={addTracktoAvailable}
                                removeTrackFromAvailable={removeTrackFromAvailable}
                                availableTrackSets={availableTrackSets}
                            />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Upload Local Track">
                            <TrackUpload 
                                onTracksAdded={onTracksAdded}
                            />
                        </ModalMenuItem>
                    </div>
                </div>
                <div className="Nav-center">
                    <DropdownOpener extraClassName="btn-success" label="🔧Apps" />
                    <div className="dropdown-menu">
                        <ModalMenuItem itemLabel="Region Set View">
                            <RegionSetSelector genome={genomeConfig.genome} />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Gene Plot">
                            <Geneplot genome={genomeConfig.genome} />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Scatter Plot">
                            <ScatterPlot genome={genomeConfig.genome} />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Session" style={{content: {
                                                        right: "unset",
                                                        bottom: "unset",
                                                        overflow: "visible",
                                                        padding: "5px",
                                                    }}}>
                            <SessionUI bundleId={bundleId} />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Go Live" style={{content: {
                                                        right: "unset",
                                                        bottom: "unset",
                                                        overflow: "visible",
                                                        padding: "5px",
                                                    }}}>
                            <LiveUI />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Screenshot">
                            <ScreenshotUI expansionAmount={REGION_EXPANDER} needClip={hasInteractionTrack} />
                        </ModalMenuItem>
                        <ModalMenuItem itemLabel="Fetch Sequence">
                            <FetchSequence genomeConfig={genomeConfig} selectedRegion={selectedRegion} />
                        </ModalMenuItem>
                    </div>
                </div>
                <div className="Nav-center">
                    <DropdownOpener extraClassName="btn-info" label="⚙Settings" />
                    <div className="dropdown-menu">
                        <label className="dropdown-item" htmlFor="switchNavigator">
                            <input
                                id="switchNavigator"
                                type="checkbox"
                                checked={isShowingNavigator}
                                onChange={onToggleNavigator}
                            />
                            <span style={{marginLeft: "1ch"}} >Show genome-wide navigator</span>
                            <span className="GenomeNavigator-tooltip">❓
                                <div className="GenomeNavigator-tooltiptext">
                                    <ul style={{lineHeight: "1.2em", marginBottom: 0}}>
                                        <li>Left mouse drag: select</li>
                                        <li>Right mouse drag: pan</li>
                                        <li>Mousewheel: zoom</li>
                                    </ul>
                                </div>
                            </span>
                        </label>
                        <label className="dropdown-item" htmlFor="isHighlightRegion">
                            <input id="isHighlightRegion" type="checkbox" 
                                checked={highlightEnteredRegion} onChange={onToggleHighlight} />
                            <span style={{marginLeft: "1ch"}} >Highlight entered region</span>
                        </label>
                        <label className="dropdown-item">
                        <ModalMenuItem itemLabel="Change highlight color" style={{content: {
                                                        left: "unset",
                                                        bottom: "unset",
                                                        overflow: "visible",
                                                        padding: "5px",
                                                    },
                                                    overlay: {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                                      }}}>
                            <HighlightColorChange color={highlightColor} onChange={onSetHighlightColor} />
                        </ModalMenuItem>
                        </label>
                        <label className="dropdown-item" htmlFor="switch3D">
                            <input id="switch3D" type="checkbox" checked={isShowing3D} onChange={onToggle3DScene} />
                            <span style={{marginLeft: "1ch"}} >VR mode</span>
                        </label>
                        <label className="dropdown-item" htmlFor="cacheToggle">
                            <input id="cacheToggle" type="checkbox" checked={this.state.isCacheEnabled} onChange={this.toggleCache} />
                            <span style={{marginLeft: "1ch"}} >Restore current view after Refresh</span>
                        </label>
                        <label className="dropdown-item" htmlFor="setLegendWidth">
                            <input type="number" id="legendWidth" step="5" min="60" max="200" 
                                defaultValue={trackLegendWidth}
                                onChange={this.changeLegendWidth} />
                            <span style={{marginLeft: "1ch"}}>Change track legend width</span>
                        </label>
                    </div>
                </div>
                <div className="Nav-center">
                    <DropdownOpener extraClassName="btn-warning" label="📖Help" />
                    <div className="dropdown-menu">
                        <label className="dropdown-item">
                            <ModalMenuItem itemLabel="Hotkeys" style={{content: {
                                                            left: "unset",
                                                            bottom: "unset",
                                                            overflow: "visible",
                                                            padding: "5px",
                                                        }}}>
                                <HotKeyInfo  />
                            </ModalMenuItem>
                        </label>
                        <label className="dropdown-item">
                            <a href="https://epigenomegateway.readthedocs.io/" target="_blank">Documentation</a>
                        </label>
                        <label className="dropdown-item">
                            <a href="http://epigenomegateway.wustl.edu/legacy" target="_blank">The 'old' browser</a>
                        </label>
                        <label className="dropdown-item">
                            <a href="https://groups.google.com/forum/#!forum/epgg" target="_blank">Google groups</a>
                        </label>
                        <label className="dropdown-item">
                            <a href="https://bit.ly/2T1OKmP" target="_blank">Join our Slack</a>
                        </label>
                        <label className="dropdown-item">
                            <a href="https://github.com/lidaof/eg-react" target="_blank">Source code @ Github</a>
                        </label>
                        <label className="dropdown-item">
                            <a href="https://www.youtube.com/channel/UCnGVWbxJv-DPDCAFDQ1oFQA" target="_blank">YouTube channel</a>
                        </label> 
                    </div>
                </div>
            </div>
        )
    }
}

export default connect(null, callbacks)(Nav);

function HighlightColorChange(props) {
    const {color, onChange} = props;
    return <React.Fragment>
        <p style={{marginRight: "40px"}}>Click the button below to change<br/>the highlight color:</p>
        <ColorPicker color={color} onChange={onChange} label="current highlight box color" disableAlpha={false} />
    </React.Fragment>
}

function DropdownOpener(props) {
    const {extraClassName, label} = props;
    return <button
        type="button"
        className={`btn dropdown-toggle ${extraClassName}`}
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
    >
        {label}
    </button>
}

class ModalMenuItem extends React.Component {
    static propTypes = {
        itemLabel: PropTypes.string
    };

    constructor(props) {
        super(props);
        this.state = {
            isOpen: false
        };
        this.toggleOpen = this.toggleOpen.bind(this);
    }

    toggleOpen() {
        this.setState(prevState => {return {isOpen: !prevState.isOpen}});
    }

    render() {
        const style = {
            ...{ overlay: {
                backgroundColor: 'rgba(111,107,101, 0.7)'}
            },
            ...this.props.style
        };
        return <React.Fragment>
            <div className="dropdown-item" onClick={this.toggleOpen}>{this.props.itemLabel}</div>
            <ReactModal
                isOpen={this.state.isOpen}
                ariaHideApp={false}
                onRequestClose={this.toggleOpen}
                shouldCloseOnOverlayClick={true}
                style={style}
            >
                <ModalCloseButton onClick={this.toggleOpen} />
                {this.props.children}
            </ReactModal>
        </React.Fragment>;
    }
}

function ModalCloseButton(props) {
    return (
        <span
            className="text-right" 
            style={{cursor: "pointer", color: "red", fontSize: "2em", position:"absolute", top: "-5px", right: "15px", zIndex: 2}}
            onClick={props.onClick}>
            ×
        </span>
    );
}
