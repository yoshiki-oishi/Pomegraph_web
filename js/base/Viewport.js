import {Animatable} from "./Animatable.js";
import {Constants} from "./Constants.js";
import {SmoothAndEfficientAnimator, SpringForceAnimator} from "./Animator.js";

export class Viewport {
    constructor(window) {
        this.animatable = new Animatable([window.x, window.y, window.width, window.height]);
        this.window = window;
//        this.setWheelCount = 0;
    }

    get bounds() {
        return this.animatable.value;
    }

    set setcanvassize(bbox){
        this.bbox = bbox;
    }

    get getcanvassize(){
        return this.bbox;
    }

    update(time) {
        return this.animatable.update(time);
    }

    project(p) { // Project world coordinates to view coordinates
        if (p.length === 1) return [this.projectWidth(p[0])];
        if (p.length === 2) return [this.projectX(p[0]), this.projectY(p[1])];
        if (p.length === 4) return [this.projectX(p[0]), this.projectY(p[1]), this.projectWidth(p[2]), this.projectHeight(p[3])];
    }

    unproject(p) { // Unproject view coordinates to world coordinates
        if (p.length === 1) return [this.unprojectWidth(p[0])];
        if (p.length === 2) return [this.unprojectX(p[0]), this.unprojectY(p[1])];
        if (p.length === 4) return [this.unprojectX(p[0]), this.unprojectY(p[1]), this.unprojectWidth(p[2]), this.unprojectHeight(p[3])];
    }

    projectX(x) { // Project x world coordinate to view coordinate
        return (x - this.bounds[0]) / this.bounds[2] * this.window.width + this.window.x;
    }

    projectY(y) { // Project y world coordinate to view coordinate
        return (y - this.bounds[1]) / this.bounds[3] * this.window.height + this.window.y;
    }

    projectWidth(w) {  // Project width in world space to width view space
        return w / this.bounds[2] * this.window.width;
    }

    projectHeight(h) {  // Project height in world space to height view space
        return h / this.bounds[3] * this.window.height;
    }

    unprojectX(x) { // Unproject x view coordinate to world coordinate
        return this.bounds[0] + this.bounds[2] * (x - this.window.x) / this.window.width;
    }

    unprojectY(y) { // Unproject y view coordinate to world coordinate
        return this.bounds[1] + this.bounds[3] * (y - this.window.y) / this.window.height;
    }

    unprojectWidth(w) { // Unproject width in view space to width in world space
        return this.bounds[2] * w / this.window.width;
    }

    unprojectHeight(h) { // Unproject height in view space to height in world space
        return this.bounds[3] * h / this.window.height;
    }

    scale(s, cx, cy) { // Scale by s at center cx,cy
        cx = cx || 0.5;
        cy = cy || 0.5;

        this.animatable.animate([this.bounds[0] + this.bounds[2] * cx * (1 - s), this.bounds[1] + this.bounds[3] * cy * (1 - s), this.bounds[2] * s, this.bounds[3] * s], SpringForceAnimator);
    }

    translate(dx, dy) { // Translation
        this.animatable.animate([this.bounds[0] + dx, this.bounds[1] + dy, this.bounds[2], this.bounds[3]], SmoothAndEfficientAnimator);
    }

    scroll(wx, wy) { // Scroll (1 means scroll one viewport extent in the desired direction)
        this.animatable.animate([this.bounds[0] + wx * this.bounds[2], this.bounds[1] + wy * this.bounds[3], this.bounds[2], this.bounds[3]], SpringForceAnimator);
    }

    center(cx, cy) { // Center at cx, cy
        this.animatable.animate([cx - this.bounds[2] * 0.5, cy - this.bounds[3] * 0.5, this.bounds[2], this.bounds[3]], SmoothAndEfficientAnimator);
    }

    set(bounds) { // Animate to the given bounds
        this.animatable.animate(bounds, SpringForceAnimator);
    }

    fitToView(worldBounds, inflate, scaleORcut) {
        const viewWidth = Math.max(this.window.width, 1);
        const viewHeight = Math.max(this.window.height, 1);
        const viewAspect = viewWidth / viewHeight;

        const worldAspect = worldBounds[2] / worldBounds[3];

        const r = worldBounds.slice();

        // true: whole content in worldBounds will be visible
        // false: only part of worldBounds will be visible
        if (scaleORcut) {
            if (viewAspect > worldAspect) {
                r[2] = r[3] * viewAspect; // Enlarge viewport to make view fit to screen; critical: if panel is very small viewport must be very large to fit view to screen
            } else {
                r[3] = r[2] / viewAspect; // Enlarge viewport to make view fit to screen; critical: if panel is very small viewport must be very large to fit view to screen
            }
        } else {
            if (viewAspect > worldAspect) {
                r[3] = r[2] / viewAspect; // Reduce viewport; view will be centered
            } else {
                r[2] = r[3] * viewAspect; // Reduce viewport; view will be centered
            }
        }

        if (inflate) {
            r[2] *= 1.2;
            r[3] *= 1.2;
        }

        r[0] += (worldBounds[2] - r[2]) / 2;
        r[1] += (worldBounds[3] - r[3]) / 2;

        // this.cur = r; // We could do this to prevent the aspect ratio from animating between window resize
        this.animatable.animate(r);
    }


    onkeypress(evt) {
        switch (evt.key) {
            case '+':
                this.scale(Constants.ZOOM_KEY_FACTOR);
                return true;
            case '-':
                this.scale(1 / Constants.ZOOM_KEY_FACTOR);
                return true;
            case 'w':
                this.scroll(0, -Constants.MOVE_KEY_FACTOR);
                return true;
            case 's':
                this.scroll(0, Constants.MOVE_KEY_FACTOR);
                return true;
            case 'd':
                this.scroll(Constants.MOVE_KEY_FACTOR, 0);
                return true;
            case 'a':
                this.scroll(-Constants.MOVE_KEY_FACTOR, 0);
                return true;
        }
        return false; // Event not consumed
    }

    pick(evt) {
        const [x, y] = evt.screenCoords;
        return x >= this.window.x && x <= this.window.x + this.window.width &&
            y >= this.window.y && y <= this.window.y + this.window.height;
    }

    onmousedown(evt) {
        if (evt.button === 2) {

            this.drag = {
                down: evt.screenCoords, // Coordinates where drag started
                dragged: false, // Actually dragged after threshold has been reached ?
                p: this.bounds.slice(0, 2) // Position of viewport when drag started
            };

            this.lastRightMouseWasDrag = false;

            return true; // Event consumed
        }
        // Event not consumed
    }

    onmousemove(evt) {
        if (this.drag) {

            const dx = this.drag.down[0] - evt.screenCoords[0];
            const dy = this.drag.down[1] - evt.screenCoords[1];
            this.drag.dragged = (this.drag.dragged || dx >= Constants.DRAG_THRESHOLD || dx < -Constants.DRAG_THRESHOLD || dy >= Constants.DRAG_THRESHOLD || dy < -Constants.DRAG_THRESHOLD);

            if (this.drag.dragged) {
                // Important: Unproject single value only! Otherwise, unproject takes position
                // of viewport into account, but this position is currently undergoing a drag operation. Also, the
                // drag operation must be computed based on screen coordinates, because the world coordinates
                // reported in evt.worldCoords are already based on the currently dragged and changed viewport.
                const wdx = this.unprojectWidth(dx);
                const wdy = this.unprojectHeight(dy);
                const ext = this.bounds.slice(2, 4); // Extent (width and height) of viewport when drag started
                this.set([this.drag.p[0] + wdx, this.drag.p[1] + wdy, ext[0], ext[1]]);

                this.lastRightMouseWasDrag = true;
            }

            return true; // Event consumed
        }
        // Event not consumed
    }

    onmouseup(evt) {
        if (evt.button === 2) {
            if (this.drag) {
                delete this.drag;
                return true; // Event consumed
            }
        }
        // Event not consumed
    }

    ondblclick(evt) {
        if (evt.button === 0) {
            // Center viewport at mouse coordinates
            this.center(evt.worldCoords[0], evt.worldCoords[1]);
            return true; // Event consumed
        }
        // Event not consumed
    }

    onwheel(evt) {
        if (!evt.shiftKey) {
            const delta = evt.deltaY; // direction.
            const cur_zoom = this.projectWidth(1.0);
            const logic_zoom = this.window.width / this.getcanvassize[2];
            let cx, cy;
            // Zoom on mouse cursor
            cx = evt.screenCoords[0] / this.window.width;
            cy = evt.screenCoords[1] / this.window.height;
            if( delta < 0 && cur_zoom < logic_zoom * Constants.ZOOM_THRESHOLD_MAX){ //4.0
                this.scale(Constants.ZOOM_WHEEL_FACTOR,cx, cy);
            }
            if( delta >= 0 && cur_zoom > logic_zoom * Constants.ZOOM_THRESHOLD_MIN){ // 0.75
                this.scale(1 / Constants.ZOOM_WHEEL_FACTOR, cx, cy);
            }
            return true; // Event consumed
        }
        // Event not consumed
    }
}
