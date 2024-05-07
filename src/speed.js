
AFRAME.registerComponent('speed', {
  schema: {
    mass: {type: 'int', default: 1000},
    radius: {type: 'float', default: 0.15}
  },

  init() {
    let node = this.el.object3D
    node.speed = new THREE.Vector3();
    node.mass = this.data.mass
  },

  tick(t, dt){
    let node = this.el.object3D

    let localPosition = new THREE.Vector3();
    localPosition.x = node.position.x + node.speed.x * dt / 1000.0
    localPosition.y = node.position.y + node.speed.y * dt / 1000.0
    localPosition.z = node.position.z + node.speed.z * dt / 1000.0

    node.position.copy(localPosition);
  },

  remove(){
  }
})


AFRAME.registerComponent('gravity', {
  init() {
  },

  tick(t, dt){
    let node = this.el.object3D
    node.speed.y -= 9.81 * dt / 1000.0
  },

  remove(){
  }
})