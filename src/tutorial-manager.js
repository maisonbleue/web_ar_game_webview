import anime from 'animejs'
import AFRAME from "aframe"
import GUI from '8gui'

const queryString = window.location.search;

const urlParams = new URLSearchParams(queryString)
const storeParam = JSON.parse(urlParams.get('inStore'))

var inStore = storeParam != undefined ? storeParam : false;

var bubbleText
var stepText
var nextButton
var skipTutorialButton

var totalSteps = 5
var offset = 0
var offsetWheel = 0
var factor = 0
var ring3AnimationStarted = false
var step = 1
var id = step
var bubbleTextArray = [
    '',
    '',
    "¡Genial! Ahora para conseguir puntos, sólo tienes que tocar la pantalla con tus dedos apuntando a los aros que aparezcan en tu pantalla ¡Cuantos más aciertos, más puntos!",
    'Tienes 40 segundos para conseguir todos los puntos posibles. Hay 3 tipos de aros y cada uno puntúa de forma diferente',
    'Si juegas en los Hiper Carrefour, encontrarás un aro especial que te dará 3 segundos adicionales si consigues acertar',
    '¡Cuidado! Cada objeto tiene un peso diferente por lo que tendrás que tenerlo en cuenta antes de lanzar'
]

var textureLoader = new THREE.TextureLoader()

var wave1 = null
var wave2 = null
var handHint = null

var notchTotal = inStore ? 9 : 6

var isTutorial = false

var weightPlane = null

isTutorial = true
var point = null

window.addEventListener('DOMContentLoaded', () => {
    bubbleText = document.getElementById('bubble-text')
    stepText = document.getElementById('step-text')
    nextButton = document.getElementById('next-button')
    skipTutorialButton = document.getElementById('skip-button')
    handHint = document.getElementById('hand-hint')

    if (isTutorial) triggerSlide1Animation()

    setInterval(() => {
        rotateWheel()
        animateWeight()
    }, 2000);

    if(nextButton) nextButton.addEventListener('click', nextButtonClicked)
    if(skipTutorialButton) skipTutorialButton.addEventListener('click', skipTutorialButtonClicked)

    // var plane = document.getElementById('point-1')

    // breathAnimationPoint(plane)

    levitateTimeHint()

    if (!inStore) {
        totalSteps = 4
        if(stepText) stepText.innerHTML = 'STEP '+ step + '/' + totalSteps + ' :'
        updateWheelShape()
    }

    setLastGroupPosition()
})


var nextButtonClicked = function() {

    document.getElementById("imgTuto1").style.display = "none"

    let tuto = document.getElementById("tutos").children[step - 1]
    if(tuto.onclick) tuto.onclick()

    if(nextButton) nextButton.removeEventListener('click', nextButtonClicked)
    
    if (step >= totalSteps) {
        document.startGame();
    }
    else {
        step++
        // console.log("Tutorial step " + step + " / " + totalSteps)

        if (inStore && step == 4) moveScoreUi('100%', '0%')
        else if (inStore && step == 5) moveScoreUi('0%', '-100%')

        setTimeout(() => {
            if(stepText) stepText.innerHTML = 'STEP '+ step + '/'+ totalSteps + ' :'

            id = step
            if (!inStore && step == 4) id = 5
            // console.log("Showing tutorial id " + id)

            if(bubbleText) bubbleText.innerHTML = bubbleTextArray[id]

            if (step === 3) slide2Animation()
        }, 300);

        if (step === 4 && !ring3AnimationStarted) {
            let ring3 = document.getElementById('ring-3')
            if (ring3) ring3.object3D.visible = true
        }
    
        if(bubbleText) anime({
            targets: bubbleText,
            translateX: -70,
            opacity: 0,
            duration: 300,
            direction: 'alternate',
            easing: 'easeOutQuint'
        });
    
        setTimeout(() => {
            if(nextButton) nextButton.addEventListener('click', nextButtonClicked)

            showNextGroup()
        }, 600);

        moveAllGroups()
    } 
}

var skipTutorialButtonClicked = function() {
    document.requestCameraAndOrientation()
    document.startGame();
}

var moveAllGroups = () => {
    var groups = document.getElementById('tutos')
    var tutorials = groups.children

    let transition = {
        position: offset
    }

    offset -= 5

    if (!inStore && step == 4) {
        tutorials[3].object3D.visible = false
    }

    var moveGroup = AFRAME.ANIME({
        targets: transition,
        duration: 500,
        position: offset,
        easing: 'easeInQuad',
        
        update: function(anim) {
            if (groups) groups.object3D.position.x = transition.position
        },
        complete: function(anim){
            // console.log("Anim remove visibility of "+ (step - 1))
            tutorials[step - 1].object3D.visible = false
        }
    })
}

var setLastGroupPosition = () => {
    var tutorials = document.getElementById('tutos').children
    if(!inStore) tutorials[tutorials.length - 1].object3D.position.x = 15.0
    else tutorials[tutorials.length - 1].object3D.position.x = 20.0
    // console.log(tutorials[tutorials.length - 1].object3D.position.x)
}

var showNextGroup = () => {
    var groups = document.getElementById('tutos')
    var tutorials = groups.children
    id = step
    if (!inStore && step == 4) {
        id = 5
    }
    tutorials[id - 1].object3D.visible = true
}


AFRAME.registerComponent('ornement', {
    schema: {
        name: {type: 'string', default: '10'}
    },
    init() {

        this.model = null

        const model = this.el.getObject3D('mesh')
        if (model) {
            this.load(model)
        } else {
            this.el.addEventListener('model-loaded', (e) => {
                this.load(e.detail.model)
            })
        }
    },

    load(model) {
        
        let name = this.data.name

        var texture = textureLoader.load('./assets/' + name + '.png')
        this.model = model
        this.model.traverse(node => {
            if(node.material) {
                node.material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                })
            }
        })

        // console.log('model : ' + model.el.id)

        if (model.el.id === 'wave-1') {
            wave1 = model
            animateWave(wave1, true)
        } else if (model.el.id === 'wave-2') {
            wave2 = model
        } else if (model.el.id === 'weight') {
            weightPlane = model
        } else if (model.el.id = 'hand-hint') {
            handHint = model
        } else if (model.el.id = 'touch-point') {
            point = model
            // console.log(point)
        }
    }
})

AFRAME.registerComponent('autoshoot', {
    schema: {},
    init() {
    },

    tick(t, dt) {

        if(step == 2 && !this.inited){
            this.inited = true
            this.lastShootTime = t
        }

        if(step == 2){
            if(this.lastShootTime + 2000 < t){
                this.lastShootTime = t
                
                let handHint = document.getElementById('hand-hint')
                if (handHint) handHintClickAnimation(handHint)

                setTimeout(() => {
                    document.shootPreview()
                }, 200);
            }
        }
    }
})

var popsOutAnimationPoint = (plane, directionValue) => {

    let transition = {
        scale: 0
    }

    AFRAME.ANIME({
        targets: transition,
        duration: 300,
        easing: 'easeOutBack',
        scale: 2,
        direction: directionValue,
        update: function(anim) {
            if (plane) {
                plane.object3D.scale.x = transition.scale
                plane.object3D.scale.y = transition.scale
            }
        },
        complete: function() {
            if (directionValue == 'normal') breathAnimationPoint(plane)
        }
    })
}

var breathAnimationPoint = (plane) => {

    // console.log('breath animation')
    AFRAME.ANIME({
        duration: 700,
        direction: 'alternate',
        autoplay: true,
        easing: 'easeOutQuint',
        update: function(anim) {
            // console.log(plane)
            if (plane) {
                // console.log(anim.progress)
                plane.object3D.scale.x = (0.005 * anim.progress) + 2
                plane.object3D.scale.y = (0.005 * anim.progress) + 2
            }
        }
    })
}



var animateWave = (wave, loopValue) => {

    // console.log('animate wave : ' + wave)
    // console.log('loop value : ' + loopValue)

    var invertProgress = 100

    var animCircle = AFRAME.ANIME({
        duration: 500,
        autoplay: false,
        delat: 750,
        easing: 'easeOutQuint',
        update: function(anim) {
            invertProgress = 100 - anim.progress

            if (wave) {
                wave.el.object3D.scale.x = (2 * anim.progress) / 100 + 2
                wave.el.object3D.scale.y = (2 * anim.progress) / 100 + 2
                wave.el.object3D.scale.z = (2 * anim.progress) / 100 + 2

                wave.material.opacity = 1 * (invertProgress / 100)
            }
        },
        complete: function() {
            invertProgress = 100
        }
    })

    var ring1 = document.getElementById('ring-1')

    var animRingFace = AFRAME.ANIME({
        duration: 1750,
        autoplay: false,
        delay: 750,
        easing: 'easeOutQuint',
        loopBegin: function() {
            if (ring1) ring1.setAttribute('animation-mixer', 'clip: *; loop: once;')
        },
        loopComplete: function() {
            if (ring1) ring1.removeAttribute('animation-mixer')
        }
    })

    var handHintAnim = AFRAME.ANIME({
        duration: 500,
        autoplay: false,
        easing: 'easeOutQuint',
        update: function(anim) {
            if (handHint) {
                handHint.el.object3D.scale.z = (2 * anim.progress) / 100 + 2
                // console.log(handHint.el.object3D.scale.z)
                // console.log(anim.progress)
            }
        },
    })

    AFRAME.ANIME({
        duration: 2500,
        loop: true,
        autoplay: true,
        easing: 'easeOutQuint',
        loopBegin: function() {
            document.shootPreview()
            animateWave.play()
            if (ring1) ring1.setAttribute('animation-mixer', 'clip: *; loop: once;')
        },
        loopComplete: function() {
            animRingFace.restart()
            animCircle.restart()
            handHintAnim.restart()
        }
    })
}

var moveScoreUi = (startValue, endValue) => {
    let scoreWrapper = document.getElementById('score-wrapper')
    scoreWrapper.style.display = 'flex'

    if (scoreWrapper) anime({
        targets: scoreWrapper,
        translateX: [startValue, endValue],
        duration: 600,
        easing: 'easeOutQuint',
    })
}

var levitateTimeHint = () => {
    let timeHint = document.getElementById('time-hint')

    if (timeHint) anime({
        targets: timeHint,
        translateY: ['3vw', '0vw'],
        duration: 800,
        direction: 'alternate',
        easing: 'easeInOutSine',
        loop: true
    })
}

var slide2Animation = () => {

    let ring4 = document.getElementById('ring-4')
    let point4 = document.getElementById('point-4')
    let group2 = document.getElementById('tutorial-group-2')

    if (group2) group2.object3D.visible = true

    let transitionX = {
        ring4Pos: 1.5
    }

    AFRAME.ANIME({
        targets: transitionX,
        easing: 'easeInOutSine',
        duration: 500,
        ring4Pos: 0.15,
        update: function(anim) {
            if (ring4) ring4.object3D.position.x = transitionX.ring4Pos
        },
        complete: function() {
            if (point4) popsOutAnimationPoint(point4, 'normal')
            showRing2()
        }
    })
}

var showRing2 = () => {

    let ring2 = document.getElementById('ring-2')
    let point2 = document.getElementById('point-2')

    let transitionX = {
        ring2Pos: -1.5,
    }

    AFRAME.ANIME({
        targets: transitionX,
        easing: 'easeInOutSine',
        duration: 500,
        ring2Pos: -0.2,
        update: function(anim) {
            if (ring2) ring2.object3D.position.x = transitionX.ring2Pos
        },
        complete: function() {
            if (point2) popsOutAnimationPoint(point2, 'normal')
            showRing3()
        }
    })
}

var showRing3 = () => {

    let ring3 = document.getElementById('ring-3')
    let point3 = document.getElementById('point-3')
    ring3AnimationStarted = true

    let transitionX = {
        ring3Pos: 1.5,
    }

    AFRAME.ANIME({
        targets: transitionX,
        easing: 'easeInOutSine',
        duration: 500,
        ring3Pos: 0.1,
        update: function(anim) {
            if (ring3) ring3.object3D.position.x = transitionX.ring3Pos
        },
        complete: function() {
            if (point3) popsOutAnimationPoint(point3, 'normal')
        }
    })
}

var handHintClickAnimation = (plane) => {

    let transition = {
        scale: 0.15
    }

    AFRAME.ANIME({
        targets: transition,
        duration: 200,
        easing: 'easeInOutSine',
        scale: 0.1,
        direction: 'alternate',
        update: function(anim) {
            if (plane) {
                plane.object3D.scale.x = transition.scale
                plane.object3D.scale.y = transition.scale
            }
        }
    })
}

var triggerSlide1Animation = () => {
    let handHint = document.getElementById('hand-hint')
    let point1 = document.getElementById('point-1')
    
    if (step !== 2) return
    if (handHint) handHintClickAnimation(handHint)

    popsOutAnimationPoint(point1, 'alternate')
}

var rotateWheel = () => {
    var wheel = document.getElementById('instore-wheel')

    let transition = {
        rotation: offsetWheel
    }

    offsetWheel = ((Math.PI * 2) / notchTotal) * factor--
    offsetWheel = offsetWheel * (180 / Math.PI) + 180;

    AFRAME.ANIME({
        targets: transition,
        rotation: offsetWheel,
        duration: 1000,
        update: function(anim) {
            if (wheel) wheel.setAttribute('rotation', {x: 0, y: transition.rotation, z: 0})
        }
    })
}

var updateWheelShape = () => {

    let ballArray = []

    for(id = 0; id <= 8; id++) {
        let ball = document.getElementById('ball-' + id)
        ballArray.push(ball)
    }

    var rotationOffset = 0

    ballArray.forEach((ball, index) => {

        ball.setAttribute('rotation', {x: 0, y: rotationOffset, z: 0} )

        rotationOffset -= 360 / notchTotal

        if (index >= 6) ball.object3D.visible = true
    })
}

var animateWeight = () => {

    let weight = document.getElementById('weight')

    let animDuration = 300

    updateWeightTexture(animDuration)

    let transitionY = {
        position: 0.05,
    }

    AFRAME.ANIME({
        targets: transitionY,
        easing: 'easeInOutSine',
        duration: animDuration,
        position: -1,
        direction: 'alternate',
        update: function(anim) {
            if (weight) weight.object3D.position.y = transitionY.position
        }
    })
}

var pass = 0

var updateWeightTexture = (animDuration) => {

    let nbr = pass++ % notchTotal

    let texture = textureLoader.load('./assets/weight-' + nbr + '_placeholder.png')

    setTimeout(() => {
        weightPlane.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
        })
    }, animDuration);
}

AFRAME.registerComponent('bonus-circle-anim', {
    init() {
        var ringWave = this.el.object3D;
        AFRAME.ANIME({
            duration: 2000,
            loop: true,
            easing: 'linear',
            update: function(anim){
                let progress = anim.progress / 100.0
                if(ringWave){
                    progress *= 3.0
                    ringWave.scale.x = 6.0 * progress
                    ringWave.scale.y = ringWave.scale.x
                    ringWave.scale.z = ringWave.scale.x
                    ringWave.traverse(n => {
                        if(n.material) n.material.opacity = 1.0 - progress
                    })
                }
            },
        })
    }
})