class Animator {

    constructor(animatable) {
        this.animatable = animatable; // The animated object
        this.done = true; // Signals when the animation is done
    }

    update(time) {
        if (!this.done) {
            this.done = this.onUpdate(time);
            if (this.done) {
                this.animatable.val = this.animatable.trg.slice(); // Switch exactly to the destination
            }
        }

        return !this.done;
    }

    onNewTarget() {
        throw new Error("Not implemented.");
    };

    onUpdate(time) {
        throw new Error("Not implemented.");
    }
}

/* SPRING ANIMATOR */

export class SpringForceAnimator extends Animator {

    constructor(animatable) {
        super(animatable);

        this.dist = [];
        this.force = [];
        this.velo = [];
        this.accel = [];

        let i = animatable.value.length;
        while (i--) {
            this.dist[i] = 0;
            this.force[i] = 0;
            this.velo[i] = 0;
            this.accel[i] = 0;
        }

        this.oldTime = -1; // Timestamp of the last update
    }

    onNewTarget() {
        // The SpringForceAnimator simply continues with its animation in the direction of the new target
        if (this.done) {
            this.oldTime = -1;
            this.done = false;
        }
    }

    onUpdate(time) {
        const n = this.animatable.value.length; // Length of array
        let i; // Loop variable
        let e = 0; // Energy

        if (this.oldTime == -1) this.oldTime = time;
        let dt = (time - this.oldTime) / 1000;
        this.oldTime = time;
        if (dt > 0.05) dt = 0.05;

        for (i = 0; i < n; i++) {
            // Compute displacement
            this.dist[i] = this.animatable.value[i] - this.animatable.target[i];

            // Compute force = spring force + damping force
            this.force[i] = -this.springK * this.dist[i] + -this.dampK * this.velo[i];

            // Compute acceleration
            this.accel[i] = this.force[i] / this.massK;

            // Update velocity
            this.velo[i] += dt * this.accel[i];

            // Update current position
            this.animatable.value[i] += dt * this.velo[i];
        }

        // Compute energy (constant factors spring constant and mass ignored)
        for (i = 0; i < n; i++) {
            e += this.velo[i] * this.velo[i]; // Kinetic energy
            e += this.dist[i] * this.dist[i]; // Potential energy
        }

        return e < this.epsilonK;
    }
}

SpringForceAnimator.prototype.springK = 192; // Spring constant
SpringForceAnimator.prototype.dampK = 24; // Damping constant
SpringForceAnimator.prototype.massK = 1; // Mass constant
SpringForceAnimator.prototype.epsilonK = 0.01; // Epsilon neighborhood to converge to destination

export class SmoothAndEfficientAnimator extends Animator {
    constructor(animatable) {
        super(animatable);
    }

    interpolator(src, dst) {
        let V = 1.5, // Controls the speed of the animation [0.1 .. 2.5], default: 1
            rho = 1.565, // Controls the ratio of zooming and panning [0.5 .. 3.0], default: 6^1/4 ≈ 1.565
            rho_2 = rho * rho, // rho^2
            rho_4 = rho_2 * rho_2, // rho^4

            dx = dst.cx - src.cx,
            dy = dst.cy - src.cy,
            d2 = dx * dx + dy * dy,
            d = Math.sqrt(d2),

            u0 = 0, w0 = src.w,
            u1 = d, w1 = dst.w,

            S,
            i = {};

        if (d > 1e-6) { // Regular case: src and dst are at different locations
            // If dist is very small and/or w0 and w1 are very large, b0 and b1 become extremely large.
            // If b0 and b1 are extremely large, r0 and r1 are undefined, because the argument passed
            // to the log function call will be 0. Therefore, we need the special case below!
            let b0 = (w1 * w1 - w0 * w0 + rho_4 * d2) / (2 * w0 * rho_2 * d),
                b1 = (w1 * w1 - w0 * w0 - rho_4 * d2) / (2 * w1 * rho_2 * d),
                r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
                r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1),
                cr0 = Math.cosh(r0),
                sr0 = Math.sinh(r0);

            S = (r1 - r0) / rho;

            i.interpolate = function (t) { // Interpolation function for regular case
                let s = t * S,
                    u = w0 / (rho_2 * d) * (cr0 * Math.tanh(rho * s + r0) - sr0);
                return {
                    cx: src.cx + u * dx,
                    cy: src.cy + u * dy,
                    w: w0 * cr0 / Math.cosh(rho * s + r0)
                };
            }
        } else { // Special case: src and dst are at (almost) the same location
            let k = (w1 < w0) ? -1 : 1;

            S = Math.abs(Math.log(w1 / w0)) / rho;

            i.interpolate = function (t) { // Interpolation function for special case
                let s = t * S;
                return {
                    cx: src.cx + t * dx,
                    cy: src.cy + t * dy,
                    w: w0 * Math.exp(k * rho * s)
                };
            }
        }

        i.duration = S / V * 1000;
        return i;
    }

    onNewTarget() {
        // The SmoothAndEfficientAnimator sets up a new interpolator toward the new target
        this.done = false;
        this.start = undefined;
        this.aspect = (this.animatable.target[2] != 0) ? this.animatable.target[3] / this.animatable.target[2] : 1;
        this.i = this.interpolator(
            {
                cx: this.animatable.value[0] + 0.5 * this.animatable.value[2],
                cy: this.animatable.value[1] + 0.5 * this.animatable.value[3],
                w: this.animatable.value[2]
            },
            {
                cx: this.animatable.target[0] + 0.5 * this.animatable.target[2],
                cy: this.animatable.target[1] + 0.5 * this.animatable.target[3],
                w: this.animatable.target[2]
            });
    }

    onUpdate(time) {
        this.start = this.start || time;
        let t = (this.i.duration > 0) ? Math.min(1, (time - this.start) / this.i.duration) : 1;

        let vp = this.i.interpolate(t);
        this.animatable.value[2] = vp.w;
        this.animatable.value[3] = vp.w * this.aspect;
        this.animatable.value[0] = vp.cx - 0.5 * this.animatable.value[2];
        this.animatable.value[1] = vp.cy - 0.5 * this.animatable.value[3];

        return t == 1;
    }
}