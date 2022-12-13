import { Constants } from "./Constants";

export class TimeGrid {

    static LINE_WIDTH = 1;

    #active;
    #viewport;

    #activeRow;

    constructor(viewport) {
        this.#active = true;
        this.#viewport = viewport;
        this.#activeRow = false;
    }

    get active() {
        return this.#active;
    }

    set active(a) {
        this.#active = a;
    }

    get activeRow() {
        return this.#activeRow;
    }

    set activeRow(a) {
        this.#activeRow = a;
    }

    draw(gc, nodelink) {
        if (!this.#active) return false;
        if (!nodelink) return false;

        const days = nodelink.dots.reduce((result, cur) => {
            if (!(isNaN(cur.node['date']) || cur.node['date'] === 0)) result.push(cur.node['date']);
            return result;
        },[]);
        const [dmin, dmax] = (days.length) ? [Math.min(...days), Math.max(...days)] : [0, 10];// dafaulting.
        let dmean = (dmax+dmin)/2;
        const dlen = dmax-dmin; //defaulting.
        // TODO データグリッドの表示に関して。
        if(dlen > Constants.GRID_MAX_DAYS){
            return;
        }
        const gsize = (Object.keys(nodelink.groups).length) ? Object.keys(nodelink.groups).find(e => e == "0") ? Object.keys(nodelink.groups).length-1 : Object.keys(nodelink.groups).length : 5; //fail safe.
        //console.log(dlen+":"+gsize);//@@<DEBUG>

        gc.lineWidth = TimeGrid.LINE_WIDTH;
        const HMAG = Constants.HORIZONTAL_MAGNITUDE; // Total width of the period.
        const VMAG = Constants.ELEVATION_MAGNITUDE;
        const [bx, by, bw, bh] = this.#viewport.bounds;

        const extent = Math.max(bw, bh); // Determine maximum extent
        //const magnitude = Math.log(extent) / Math.log(10); // Get the magnitude of maximum extent = 10 ^ magnitude
        const magnitude = 1.0; // truncate grid zoom.
        let advance = Math.pow(10, Math.floor(magnitude) - 1); // Determine how much to add each step if we want 10 grid lines = 10 ^ (magnitude - 1)
        let inc = this.#viewport.project([advance])[0]; // get grid tic unit on the viewport.

        let [X, Y] = (days.length) ? [-HMAG, -VMAG] : [Math.floor(bx/advance)*advance, Math.floor(by/advance)*advance]; // Find even x for starting the coarser grid (with fail safe)
        let p = this.#viewport.project([X, Y]);// Convert to screen coordinates

        let x, y;
// Draw horizontal stripe.
//        gc.save();
        if(this.#activeRow){
            gc.fillStyle = Constants.COLOR_FILL_GROUP;
            const vinc = inc * VMAG / (gsize);
            p[1] -= vinc *0.5;
            while (p[1] < gc.canvas.height) {
                y = Math.floor(p[1]); // Center on pixel to always get thin lines
                //gc.moveTo(0, y);
                //gc.lineTo(gc.canvas.width, y);
                gc.fillRect(0, y, gc.canvas.width, vinc);
                p[1] += vinc * 2;
            }
        }
        gc.strokeStyle = Constants.COLOR_LINE_DATE;
// Draw the time lapse lines.
        const hinc = inc * HMAG / dlen;
        gc.beginPath();
        while (p[0] < gc.canvas.width) {
            x = Math.floor(p[0]); // Center on pixel to always get thin lines
            gc.moveTo(x, 0);
            gc.lineTo(x, gc.canvas.height);
            p[0] += hinc;
        }
        gc.stroke();
// Write the horizontal axis label.
        const BOTTOM_MARGIN = 40;
        const X_AXIS_LABEL = ' Timeline \u2192';
        gc.font = '30px sans serif';
        gc.fillStyle = Constants.COLOR_LINE_DATE;
        gc.fillText(X_AXIS_LABEL, gc.canvas.width/2, gc.canvas.height - BOTTOM_MARGIN);
//        gc.restore();
    }// End of draw()
}