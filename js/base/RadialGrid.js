import { Constants } from "./Constants";


export class RadialGrid {

    static LINE_WIDTH = 1;

    #active;
    #viewport;

    constructor(viewport) {
        this.#active = false;
        this.#viewport = viewport;
    }

    get active() {
        return this.#active;
    }

    set active(a) {
        this.#active = a;
    }

    draw(gc){
        if (!this.#active) return false;

        //gc.lineWidth = RadialGrid.LINE_WIDTH;
        const [bx, by, bw, bh] = this.#viewport.bounds;

        const extent = Math.max(bw, bh); // Determine maximum extent
        //const magnitude = Math.log(extent) / Math.log(10); // Get the magnitude of maximum extent = 10 ^ magnitude
        const magnitude = 1.0;//
        let advance = Math.pow(10, Math.floor(magnitude) - 1); // Determine how much to add each step if we want 10 grid lines = 10 ^ (magnitude - 1)

       gc.save()
        gc.strokeStyle = Constants.COLOR_LINE_REGULAR;
        gc.font = '40px sans serif';
        gc.textAlign = "center";
        gc.textBaseline = "top";
        // Translate to screen coordinates
        const [X, Y] = [0, 0];
        let p = this.#viewport.project([X, Y]);
        let inc = this.#viewport.project([advance])[0] * Constants.RADIAL_TICK_MAGNITUTE;
        const rad = [...Array(parseInt(Math.max(gc.canvas.width, gc.canvas.height)/inc/2) + 1)].map((_, i) => i * inc + inc * 0.5); // Equivallent for for(let i=inc/2; i <extent/2; i+=inc, cnt++) rad[cnt] = i;

        // Draw the grid lines of the coarser grid
        let isOdd = rad.length % 2 ? true: false;
        rad.reverse().forEach((v, i) => {
            gc.beginPath();
            const [x, y] = [Math.floor(p[0]), Math.floor(p[1])]; // Center on pixel to always get thin lines
            gc.fillStyle = isOdd ? 'rgb('+ (220+(245-220)/(rad.length)*(rad.length-i)) +',' + (230+(245-230)/(rad.length)*(rad.length-i)) + ', 255)': "rgb(255, 255, 255)";
            gc.arc(...p, v, 0, 2 * Math.PI);
            isOdd = ! isOdd;
            gc.fill();
            gc.fillText((rad.length-i), p[0], p[1]-v-inc/2);
        })
//        gc.stroke();
        gc.restore();
    }
}