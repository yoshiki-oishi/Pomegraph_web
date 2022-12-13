export class Grid {

    static LINE_WIDTH = 1;

    #active;
    #viewport;

    constructor(viewport) {
        this.#active = true;
        this.#viewport = viewport;
    }

    get active() {
        return this.#active;
    }

    set active(a) {
        this.#active = a;
    }

    draw(gc) {
        if (!this.#active) return false;

        gc.lineWidth = Grid.LINE_WIDTH;
        const [bx, by, bw, bh] = this.#viewport.bounds;

        const extent = Math.max(bw, bh); // Determine maximum extent
        const magnitude = Math.log(extent) / Math.log(10); // Get the magnitude of maximum extent = 10 ^ magnitude
        let advance = Math.pow(10, Math.floor(magnitude) - 1); // Determine how much to add each step if we want 10 grid lines = 10 ^ (magnitude - 1)

        let X = Math.floor(bx / advance) * advance; // Find an even x to start with the grid
        let Y = Math.floor(by / advance) * advance; // Find an even y to start with the grid

        const c = (advance * 10) / extent; // Fade the grid line color..

        let co = 1 - c * 0.25; // ..between 1 and 0.75
        co = Math.floor(255 * co);
        gc.strokeStyle = 'rgb(' + co + ', ' + co + ', ' + co + ')';

        // Convert to screen coordinates
        let p = this.#viewport.project([X, Y]);
        let inc = this.#viewport.project([advance])[0];
        let x, y;

        // Draw the grid lines
        gc.beginPath();
        while (p[0] < gc.canvas.width) {
            x = Math.floor(p[0]) + 0.5; // Center on pixel to always get thin lines
            gc.moveTo(x, 0);
            gc.lineTo(x, gc.canvas.height);
            p[0] += inc;
        }
        while (p[1] < gc.canvas.height) {
            y = Math.floor(p[1]) + 0.5; // Center on pixel to always get thin lines
            gc.moveTo(0, y);
            gc.lineTo(gc.canvas.width, y);
            p[1] += inc;
        }
        gc.stroke();

        // Draw a second coarser grid on top
        advance *= 10;

        X = Math.floor(bx / advance) * advance; // Find even x for starting the coarser grid
        Y = Math.floor(by / advance) * advance; // Find even y

        co = 0.5 + (1 - c) * 0.25; // Fade color of coarser grid between 0.5 and 0.75
        co = Math.floor(255 * co);
        gc.strokeStyle = 'rgb(' + co + ', ' + co + ', ' + co + ')';

        // Convert to screen coordinates
        p = this.#viewport.project([X, Y]);
        inc = this.#viewport.project([advance])[0];

        // Draw the grid lines of the coarser grid
        gc.beginPath();
        while (p[0] < gc.canvas.width) {
            x = Math.floor(p[0]) + 0.5; // Center on pixel to always get thin lines
            gc.moveTo(x, 0);
            gc.lineTo(x, gc.canvas.height);
            p[0] += inc;
        }
        while (p[1] < gc.canvas.height) {
            y = Math.floor(p[1]) + 0.5; // Center on pixel to always get thin lines
            gc.moveTo(0, y);
            gc.lineTo(gc.canvas.width, y);
            p[1] += inc;
        }
        gc.stroke();
    }
}