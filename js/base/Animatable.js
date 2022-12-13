import {SpringForceAnimator} from "./Animator.js";

export class Animatable {
    constructor(init) {
        this.val = init.slice();
        this.trg = init.slice();

        this.animator = SpringForceAnimator;
        this.animators = {}; // Animator cache
        this.animators[this.animator] = new this.animator(this);
    }

    get value() {
        return this.val;
    }

    get target() {
        return this.trg;
    }

    animate(to, animator) {
        this.trg = to;
        if (animator && animator != this.animator) this.animator = animator;
        if (!this.animators[this.animator]) this.animators[this.animator] = new this.animator(this); // Dynamically create animator when needed
        this.animators[this.animator].onNewTarget();
    }

    step(to) {
        let i = to.length;
        while (i--) {
            this.val[i] = to[i];
            this.trg[i] = to[i];
        }
        this.animators[this.animator].onNewTarget();
    };

    update(time) {
        return this.animators[this.animator].update(time);
    }
}