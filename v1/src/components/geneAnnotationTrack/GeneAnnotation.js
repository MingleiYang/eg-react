import PropTypes from 'prop-types';
import SvgComponent from '../SvgComponent';

export const ANNOTATION_HEIGHT = 8;
export const LABEL_SIZE = ANNOTATION_HEIGHT * 1.5;

const ARROW_WIDTH = 5;
const ARROW_SEPARATION = 10;
const COLOR = "blue";
const IN_EXON_ARROW_COLOR = "white";

const LABEL_BACKGROUND_PADDING = 2;

export class GeneAnnotation extends SvgComponent {
    onClick(event) {
        if (this.props.onClick) {
            this.props.onClick(event, this.props.gene);
            event.stopPropagation();
        }
    }

    componentDidMount() {
        this.group.on("click", this.onClick.bind(this));
    }

    render() {
        this.group.clear();
        let gene = this.props.gene;

        const startX = this.scale.baseToX(gene.absStart);
        const endX = this.scale.baseToX(gene.absEnd);
        const centerY = this.props.topY + ANNOTATION_HEIGHT / 2;
        const bottomY = this.props.topY + ANNOTATION_HEIGHT;

        if (endX - startX < 1 && !this.props.isLabeled) { // No use rendering if less than one pixel wide
            return null;
        }

        // Box that covers the whole annotation to increase the click area
        let coveringBox = this.group.rect().attr({
            x: startX,
            y: this.props.topY,
            width: endX - startX,
            height: ANNOTATION_HEIGHT
        });
        if (!this.props.isLabeled) { // Unlabeled: just fill the box and end there
            coveringBox.fill(COLOR);
            return null;
        } else {
            coveringBox.opacity(0);
        }

        // Center line
        this.group.line(startX, centerY, endX, centerY).stroke({
            color: COLOR,
            width: 2
        });

        // Exons
        // someComponent.clipWith(exonClip) will make it show up only where the exons are.
        let exonClip = this.group.clip();
        for (let exon of gene.absExons) {
            let exonStart = exon[0];
            let exonEnd = exon[1];
            let exonBox = this.group.rect().attr({
                x: this.scale.baseToX(exonStart),
                y: this.props.topY,
                width: this.scale.basesToXWidth(exonEnd - exonStart),
                height: ANNOTATION_HEIGHT,
                fill: COLOR
            });
            exonClip.add(exonBox.clone());
        }

        // Arrows
        for (let x = startX; x <= endX; x += ARROW_SEPARATION) {
            let arrowTipX = gene.strand === "+" ?
                x - ARROW_WIDTH : // Point to the right
                x + ARROW_WIDTH; // Point to the left
            let arrowPoints = [
                [arrowTipX, this.props.topY],
                [x, centerY],
                [arrowTipX, bottomY]
            ]

            // Each arrow is duplicated, but the second set will only draw inside exons.
            this.group.polyline(arrowPoints).attr({
                fill: "none",
                stroke: COLOR,
                "stroke-width": 1
            });
            this.group.polyline(arrowPoints).attr({
                fill: "none",
                stroke: IN_EXON_ARROW_COLOR,
                "stroke-width": 1
            }).clipWith(exonClip); // <-- Note the .clipWith()
        }

        // Label
        // Move the label a little more to the left if the arrow is pointing that way
        let labelX = (gene.strand === "+" ? startX - ARROW_WIDTH : startX) - 5;
        let label = this.group.text(gene.name).attr({
            x: labelX,
            y: this.props.topY - ANNOTATION_HEIGHT,
            "text-anchor": "end",
            "font-size": LABEL_SIZE,
        });
        let labelBox = label.bbox();
        if (labelBox.x < 0) { // Move the label into view
            label.x(labelBox.width + 5);
            labelBox = label.bbox(); // Since we moved the label, we need to get the box again
        }
        let labelBackground = this.group.rect().attr({
            x: labelBox.x - LABEL_BACKGROUND_PADDING,
            y: labelBox.y,
            width: labelBox.width + 2 * LABEL_BACKGROUND_PADDING,
            height: labelBox.height,
            fill: "white",
            opacity: 0.75,
        });
        labelBackground.backward();

        return null;
    }
}

export default GeneAnnotation;

GeneAnnotation.propTypes = {
    gene: PropTypes.object.isRequired,
    isLabeled: PropTypes.bool.isRequired,
    topY: PropTypes.number.isRequired,
    onClick: PropTypes.func,
}