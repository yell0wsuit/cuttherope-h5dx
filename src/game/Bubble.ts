import GameObject from "@/visual/GameObject";

class Bubble extends GameObject {
    popped: boolean;
    withoutShadow: boolean;
    capturedByBulb: boolean;
    conveyorId = -1;

    constructor() {
        super();
        this.popped = false;
        this.withoutShadow = false;
        this.capturedByBulb = false;
    }

    override draw() {
        // If on conveyor or in rotated circle, only draw children (overlay), not the stain
        if (this.withoutShadow || this.conveyorId !== -1) {
            this.preDraw();
            this.postDraw();
        } else {
            super.draw();
        }
    }
}

export default Bubble;
