/*
 * An object type representing an implicit sphere.
 *
 * @param center A Vector3 object representing the position of the center of the sphere
 * @param radius A Number representing the radius of the sphere.
 * 
 * Example usage:
 * var mySphere = new Sphere(new Vector3(1, 2, 3), 4.23);
 * var myRay = new Ray(new Vector3(0, 1, -10), new Vector3(0, 1, 0));
 * var result = mySphere.raycast(myRay);
 * 
 * if (result.hit) {
 *   console.log("Got a valid intersection!");
 * }
 */

var Sphere = function(center, radius, color) {
  // Sanity checks (your modification should be below this where indicated)
  if (!(this instanceof Sphere)) {
    console.error("Sphere constructor must be called with the new operator");
  }

  this.center = center;
  this.radius = radius;
  this.color = color;

  // todo - make sure this.center and this.radius are replaced with default values if and only if they
  // are invalid or undefined (i.e. center should be of type Vector3 & radius should be a Number)
  // - the default center should be the zero vector
  // - the default radius should be 1
  if (this.center == undefined) {
    this.center = new Vector3(0,0,0);
  }

  if (this.radius == undefined) {
    this.radius = 1;
  }

  if (this.color == undefined) {
    this.color = new Vector3(1,1,1)
  }

  // Sanity checks (your modification should be above this)
  if (!(this.center instanceof Vector3)) {
    console.error("The sphere center must be a Vector3");
  }

  if ((typeof(this.radius) != 'number')) {
    console.error("The radius must be a Number");
  }

  if (!(this.color instanceof Vector3)) {
    console.error("The sphere color must be a Vector3");
  }
};

Sphere.prototype = {
  
  //----------------------------------------------------------------------------- 
  raycast: function(r1) {
    var result = {hit : false};
    var a = r1.direction.dot(r1.direction);
    var b = 2 * r1.direction.dot(r1.origin.clone().subtract(this.center));
    var c = (r1.origin.clone().subtract(this.center)).dot(r1.origin.clone().subtract(this.center)) - Math.pow(this.radius,2);

    var discriminant = Math.pow(b,2) - (4 * a * c);

    // An object created from a literal that we will return as our result
    // Replace the null values in the properties below with the right values
    if (discriminant >= 0) {
      var alpha0 = (-b + Math.sqrt(discriminant)) / (2 * a);
      var alpha1 = (-b - Math.sqrt(discriminant)) / (2 * a);

      if (alpha0 >= 0 && alpha1 >= 0) {
        var alpha = Math.abs(alpha0) > Math.abs(alpha1) ? alpha1 : alpha0;
        var intersection = r1.origin.clone().add(r1.direction.clone().multiplyScalar(alpha));
        var normal = intersection.clone().subtract(this.center).normalize();

        result = {
          hit: true,      // should be of type Boolean
          point: intersection,    // should be of type Vector3
          normal: normal,   // should be of type Vector3
          distance: alpha, // should be of type Number (scalar)
        };
      }
    }
    return result;
  }
}

// EOF 00100001-10