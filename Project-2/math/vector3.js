/* Conlyn Pattison
 * Partner: Marc Garcia
 * 
 * An "object" representing a 3d vector to make operations simple and concise.
 *
 * Similar to how we work with plain numbers, we will work with vectors as
 * an entity unto itself.  Note the syntax below: var Vector3 = function...
 * This is different than you might be used to in most programming languages.
 * Here, the function is meant to be instantiated rather than called and the
 * instantiation process IS similar to other object oriented languages => new Vector3()
 */

var Vector3 = function(x = 0, y = 0, z = 0) {
  this.x = x; this.y = y; this.z = z;

  // Sanity check to prevent accidentally using this as a normal function call
  if (!(this instanceof Vector3)) {
    console.error("Vector3 constructor must be called with the 'new' operator");
  }

  // todo - make sure to set a default value in case x, y, or z is not passed in
}

Vector3.prototype = {

  //----------------------------------------------------------------------------- 
  set: function(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  },

  //----------------------------------------------------------------------------- 
  clone: function() {
    return new Vector3(this.x, this.y, this.z);
  },

  //----------------------------------------------------------------------------- 
  copy: function(other) {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    return this;
  },

  //----------------------------------------------------------------------------- 
  negate: function() {
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
    return this;
  },

  //----------------------------------------------------------------------------- 
  add: function(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  },

  //----------------------------------------------------------------------------- 
  subtract: function(v) { // A.subtract(B) == A - B
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  },

  //----------------------------------------------------------------------------- 
  multiplyScalar: function(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  },

  //----------------------------------------------------------------------------- 
  length: function() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2));
  },

  //----------------------------------------------------------------------------- 
  lengthSqr: function() {
    return (Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2));
  },

  //----------------------------------------------------------------------------- 
  normalize: function() {
    var prevLength = this.length();
    this.x /= prevLength;
    this.y /= prevLength;
    this.z /= prevLength;
    return this;
  },

  //----------------------------------------------------------------------------- 
  dot: function(other) {
    return (this.x * other.x) + (this.y * other.y) + (this.z * other.z);
  },


  //============================================================================= 
  // The functions below must be completed in order to receive an "A"

  //----------------------------------------------------------------------------- 
  fromTo: function(fromPoint, toPoint) {
    if (!(fromPoint instanceof Vector3) || !(toPoint instanceof Vector3)) {
      console.error("fromTo requires to vectors: 'from' and 'to'");
    }
    var fromToVec = new Vector3((toPoint.x - fromPoint.x), (toPoint.y - fromPoint.y), (toPoint.z - fromPoint.z));
    return fromToVec;
  },

  //----------------------------------------------------------------------------- 
  project: function(vectorToProject, otherVector) {
    var dot = vectorToProject.dot(otherVector); 
    var otherVectNorm = new Vector3;
    otherVectNorm = otherVector.clone();
    otherVectNorm.normalize();
    var lengthResult = dot / otherVector.length();
    return otherVectNorm.multiplyScalar(lengthResult);
  }
};

// EOF 00100001-10
