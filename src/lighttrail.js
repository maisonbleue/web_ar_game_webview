AFRAME.registerComponent('lighttrail', {
  schema: {
    maxDuration: { type: 'float', default: 0.6 },
    maxOpacity: { type: 'float', default: 0.25 },
    maxTeleportDistance: { type: 'float', default: 2.0 },
    tubeRadius: { type: 'number', default: 0.025 }, // Tube radius
    radialSegments: { type: 'int', default: 12 }, // Number of radial segments for the TubeGeometry
  },

  reset() {
    // Initialize the trail
    this.path = [];
    this.totalLength = 0;
    this.timestamps = [];
    
    let position = new THREE.Vector3();
    this.el.object3D.getWorldPosition(position);

    for (let i = 0; i < 2; i++) {
       // Get the current position of the A-Frame entity
      this.path.push(position); // Add the position to the path
      this.timestamps.push(Date.now());
    }
    this.lastPosition = position;
  },

  init() {
    this.target = this.el.object3D
    while(this.target.children[0]) this.target = this.target.children[0]

    this.reset()

    // Create TubeGeometry for the trail
    const tubeGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(this.path),
      this.path.length,
      this.data.tubeRadius, // Use tube radius from the schema
      this.data.radialSegments, // Use radial segments from the schema
      false // Closed loop (false for an open trail)
    );

    // Create a custom shader material
    this.material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;

        void main() {
          vOpacity = opacity;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vOpacity;

        void main() {
          gl_FragColor = vec4(1.0, 1.0, 1.0, vOpacity); // Set the color and opacity based on vOpacity
        }
      `,
      transparent: true,
    });

    // Create a mesh using the tube geometry and material
    this.mesh = new THREE.Mesh(tubeGeometry, this.material);
    this.mesh.frustumCulled = false;

    let node = this.el.object3D
    while(node.parent) node = node.parent
    this.scene = node

    this.scene.add(this.mesh);
  },

  remove() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }
  },

  exceedsMaxDuration() {
    if (this.timestamps.length === 0) return false;

    const currentTime = Date.now();
    const firstTimestamp = this.timestamps[0];
    const duration = (currentTime - firstTimestamp) / 1000; // Convert milliseconds to seconds
    return duration > this.data.maxDuration;
  },

  tick(t, dt) {

    let position = new THREE.Vector3();
    this.el.object3D.getWorldPosition(position);

    // Check if teleportation occurred
    const teleportDistance = this.lastPosition.distanceTo(position);
    if (teleportDistance > this.data.maxTeleportDistance) {
      return this.reset()
    }
    else {
      this.path.push(position); // Add the position to the path
      this.timestamps.push(Date.now());
      this.lastPosition = position;
    }

    // Ensure the path does not exceed the maximum length
    while (this.exceedsMaxDuration()) {
      const removedSegmentLength = this.path[0].length;
      this.path.shift();
      this.timestamps.shift();
      this.totalLength -= removedSegmentLength;
    }

    if(this.path.length >= 2) {
      try {

        this.mesh.geometry = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(this.path),
          this.path.length,
          this.data.tubeRadius,
          this.data.radialSegments,
          false
        );

        let totalTimeDif = (Date.now() - this.timestamps[0]) / 1000.0
        let minOpacity = this.data.maxOpacity * (1.0 - (totalTimeDif / this.data.maxDuration))

        const opacityValues = [];
        for (let i = 0; i < this.mesh.geometry.attributes.position.count; i++) {
          let p = i / this.mesh.geometry.attributes.position.count
          let opacity = this.data.maxOpacity * (p) + minOpacity * (1.0 - p);
          opacityValues.push(opacity);
        }

        const opacityArray = new Float32Array(opacityValues);
        const opacityAttribute = new THREE.BufferAttribute(opacityArray, 1);
        if(this.mesh.geometry.setAttribute) this.mesh.geometry.setAttribute('opacity', opacityAttribute);
        else this.mesh.geometry.addAttribute('opacity', opacityAttribute); // THREEJS Old naming support
      } catch(e) {
        console.error(e)
      }
    }
  }
});
