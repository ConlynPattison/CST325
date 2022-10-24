function Camera(input) {
    // The following two parameters will be used to automatically create the cameraWorldMatrix in this.update()
    this.cameraYaw = 0;
    this.cameraPosition = new Vector3();
    this.rotationMatrix = new Matrix4();

    this.cameraWorldMatrix = new Matrix4();

    // -------------------------------------------------------------------------
    this.getViewMatrix = function() {
        return this.cameraWorldMatrix.clone().inverse();
    }

    // -------------------------------------------------------------------------
    this.getForward = function() {
        // todo #6 - pull out the forward direction from the world matrix and return as a vector
        //         - recall that the camera looks in the "backwards" direction
        var Zx = this.cameraWorldMatrix.getElement(0,2); // 0
        var Zy = this.cameraWorldMatrix.getElement(1,2); // 0
        var Zz = this.cameraWorldMatrix.getElement(2,2); // 1
        forwardVector = new Vector3(Zx, Zy, Zz);
        return forwardVector;
    }
    // -------------------------------------------------------------------------
    this.update = function(dt) {
        var currentForward = this.getForward();
        var incrementScalar = 0.4;
        console.log(dt);

        if (input.up) {
            // todo #7 - move the camera position a little bit in its forward direction
            this.cameraPosition.subtract(currentForward.multiplyScalar(incrementScalar));
            console.log(this.cameraPosition);
        }

        if (input.down) {
            // todo #7 - move the camera position a little bit in its backward direction
            this.cameraPosition.add(currentForward.multiplyScalar(incrementScalar));
            console.log(this.cameraPosition);
        }

        if (input.left) {
            // todo #8 - add a little bit to the current camera yaw
            this.cameraYaw += incrementScalar*5;
        }

        if (input.right) {
            // todo #8 - subtract a little bit from the current camera yaw
            this.cameraYaw -= incrementScalar*5;
        }

        // todo #7 - create the cameraWorldMatrix from scratch based on this.cameraPosition
        this.cameraWorldMatrix.makeTranslation(this.cameraPosition);

        // todo #8 - create a rotation matrix based on cameraYaw and apply it to the cameraWorldMatrix
        // (order matters!)        
        this.cameraWorldMatrix.multiply(this.rotationMatrix.makeRotationY(this.cameraYaw));

    }
}

// EOF 00100001-10