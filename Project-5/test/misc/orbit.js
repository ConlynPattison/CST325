    var camera, scene, renderer;
    var earth, moon;

    var clock = new THREE.Clock();

    initScene();
    animate();

    function initScene() {
      var extent = 6;
      camera = new THREE.OrthographicCamera(-extent, extent, -extent, extent);
      camera.position.z = 5.0;

      scene = new THREE.Scene();

      renderer = new THREE.WebGLRenderer();
      renderer.setSize(500, 500);
      renderer.setClearColor(new THREE.Color("#000000"), 1.0);

      var root = document.getElementById("orbit-root")
      root.appendChild(renderer.domElement);

      var sunGeometry = new THREE.SphereGeometry(1, 10, 10);
      var sun = new THREE.Mesh(sunGeometry, new THREE.MeshBasicMaterial({ color: "#ffff00" }));
      scene.add(sun);

      var geometry = new THREE.SphereGeometry(0.5, 10, 10);
      earth = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: "#7777ff" }));
      earth.matrixAutoUpdate = false;
      scene.add(earth);

      var moonGeometry = new THREE.SphereGeometry(0.25, 10, 10);
      moon = new THREE.Mesh(moonGeometry, new THREE.MeshBasicMaterial({ color: "#888888" }));
      moon.matrixAutoUpdate = false;
      scene.add(moon);
    }

    function createEarthMatrix(angle, position) {
      var translation = new Matrix4().makeTranslation(position);
      var rotation = new Matrix4().makeRotationZ(angle);
      return rotation.multiply(translation);
    }

    function animate() {
      var elapsed = clock.getElapsedTime();

      var earthTransform = createEarthMatrix(elapsed * 45, new Vector4(4, 0, 0, 1));

      var e = earthTransform.elements;
      earth.matrixWorld.set(
        e[0], e[1], e[2], e[3],
        e[4], e[5], e[6], e[7],
        e[8], e[9], e[10], e[11],
        e[12], e[13], e[14], e[15]
      );

      var moonTransform = createMoonMatrix(elapsed * 120, new Vector4(1, 0, 0, 1), earthTransform);
      e = moonTransform.elements;

      moon.matrixWorld.set(
        e[0], e[1], e[2], e[3],
        e[4], e[5], e[6], e[7],
        e[8], e[9], e[10], e[11],
        e[12], e[13], e[14], e[15]
      );

      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }

// EOF 00100001-10