import CTRGameObject from "@/game/CTRGameObject";
import Vector from "@/core/Vector";
import KeyFrame from "@/visual/KeyFrame";
import ActionType from "@/visual/ActionType";
import Radians from "@/utils/Radians";
import Constants from "@/utils/Constants";
import ResourceId from "@/resources/ResourceId";
import Timeline from "@/visual/Timeline";

const BOUNCER_HEIGHT = 10;

const IMG_OBJ_BOUNCER_01_start = 0;
const IMG_OBJ_BOUNCER_01_Frame_2 = 1;
const IMG_OBJ_BOUNCER_01_Frame_3 = 2;
const IMG_OBJ_BOUNCER_01_Frame_4 = 3;
const IMG_OBJ_BOUNCER_01_end = 4;

const IMG_OBJ_BOUNCER_02_start_ = 0;
const IMG_OBJ_BOUNCER_02_Frame_2 = 1;
const IMG_OBJ_BOUNCER_02_Frame_3 = 2;
const IMG_OBJ_BOUNCER_02_Frame_4 = 3;
const IMG_OBJ_BOUNCER_02_end = 4;

class Bouncer extends CTRGameObject {
    angle: number;
    skip: number;
    t1: Vector;
    t2: Vector;
    b1: Vector;
    b2: Vector;

    constructor(x: number, y: number, width: number, angle: number) {
        super();

        this.angle = 0;
        this.skip = 0;
        this.t1 = Vector.newZero();
        this.t2 = Vector.newZero();
        this.b1 = Vector.newZero();
        this.b2 = Vector.newZero();

        let imageId: number = Constants.UNDEFINED;
        if (width === 1) {
            imageId = ResourceId.IMG_OBJ_BOUNCER_01;
        } else if (width === 2) {
            imageId = ResourceId.IMG_OBJ_BOUNCER_02;
        }
        this.initTextureWithId(imageId);

        this.rotation = angle;
        this.x = x;
        this.y = y;

        this.updateRotation();
        const delay = 0.04;
        const k = this.addAnimationDelay(
            delay,
            Timeline.LoopType.NO_LOOP,
            IMG_OBJ_BOUNCER_01_start,
            IMG_OBJ_BOUNCER_01_end
        );
        const t = this.getTimeline(k);
        if (t) {
            t.addKeyFrame(KeyFrame.makeSingleAction(this, ActionType.SET_DRAWQUAD, 0, 0, delay));
        }
    }

    updateRotation() {
        const x = this.x;
        const y = this.y;
        const width = this.width / 2;

        this.t1.x = x - width;
        this.t2.x = x + width;
        this.t1.y = this.t2.y = y - BOUNCER_HEIGHT / 2.0;

        this.b1.x = this.t1.x;
        this.b2.x = this.t2.x;
        this.b1.y = this.b2.y = y + BOUNCER_HEIGHT / 2.0;

        const angle = (this.angle = Radians.fromDegrees(this.rotation));

        this.t1.rotateAround(angle, x, y);
        this.t2.rotateAround(angle, x, y);
        this.b1.rotateAround(angle, x, y);
        this.b2.rotateAround(angle, x, y);
    }

    override update(delta: number) {
        super.update(delta);
        if (this.mover) {
            this.updateRotation();
        }
    }

    getConveyorSize(): Vector {
        // Use local bounds for conveyor size calculation
        return new Vector(this.width, this.height);
    }

    getConveyorPadding(): number {
        const size = this.getConveyorSize();
        return (size.x + size.y) / 4;
    }
}

export default Bouncer;
