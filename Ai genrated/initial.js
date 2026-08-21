"use strict";

/*
=============================================================
TOYOTA PARTICLE ENGINE
UPDATED DENSITY SYSTEM

Desktop:
    up to 1,000,000 particles

Mobile:
    adaptive 80,000 - 250,000 particles

IMPORTANT:
The engine allocates the maximum required particle buffer,
but only SHOWS about 100,000 particles initially.

During vehicle generation / formation:
    100,000
        ↓
    200,000
        ↓
    400,000
        ↓
    700,000
        ↓
    1,000,000

This makes the vehicle become progressively denser instead
of trying to display one million particles immediately.

After formation:
    all generated particles remain fixed.

The car files do NOT need to be changed because they already
accept a particle count through build(count).
=============================================================
*/


window.ToyotaCars =
    window.ToyotaCars || {};

window.ToyotaShapeTools =
    window.ToyotaShapeTools || {};


/* =========================================================
   COMMON SHAPE TOOLS
========================================================= */

const Tools =
    window.ToyotaShapeTools;


Tools.sequence =
function(index, salt = 1){

    const a =
        0.6180339887498949;

    const b =
        0.7548776662466927;

    return {

        x:
            (
                index*a +
                salt*.173
            ) % 1,

        y:
            (
                index*b +
                salt*.271
            ) % 1,

        z:
            (
                index*(a+b) +
                salt*.119
            ) % 1
    };
};


Tools.put =
function(array,index,point){

    const n =
        index*3;

    array[n] =
        point.x;

    array[n+1] =
        point.y;

    array[n+2] =
        point.z;
};


Tools.color =
function(array,index,color){

    const n =
        index*3;

    array[n] =
        color[0];

    array[n+1] =
        color[1];

    array[n+2] =
        color[2];
};


Tools.wheel =
function(
    sequence,
    centerX,
    radius,
    z
){

    const angle =
        sequence.x *
        Math.PI *
        2;

    const radial =
        Math.sqrt(
            sequence.y
        ) *
        radius;

    return {

        x:
            centerX +
            Math.cos(angle) *
            radial,

        y:
            radius +
            Math.sin(angle) *
            radial,

        z
    };
};


Tools.profileY =
function(
    x,
    profile
){

    for(
        let i=0;
        i<profile.length-1;
        i++
    ){

        const a =
            profile[i];

        const b =
            profile[i+1];


        if(
            x>=a.x &&
            x<=b.x
        ){

            const t =
                (
                    x-a.x
                )/
                (
                    b.x-a.x ||
                    1
                );


            return (
                a.y +
                (
                    b.y-a.y
                ) *
                t
            );
        }
    }


    return profile[
        profile.length-1
    ].y;
};


/* =========================================================
   DOM
========================================================= */

const stage =
    document.getElementById(
        "stage"
    );

const loading =
    document.getElementById(
        "loading"
    );

const progressFill =
    document.getElementById(
        "progress-fill"
    );

const progressNumber =
    document.getElementById(
        "progress-number"
    );

const buttons =
    [
        ...document.querySelectorAll(
            ".car-btn"
        )
    ];


/* =========================================================
   DEVICE DETECTION
========================================================= */

const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(
        navigator.userAgent
    ) ||
    window.innerWidth <= 850;


const deviceMemory =
    navigator.deviceMemory ||
    4;


const hardwareThreads =
    navigator.hardwareConcurrency ||
    4;


/*
   Maximum density.

   We deliberately do NOT attempt 1 trillion particles.

   One million particles is already extremely dense for
   a browser particle scene.
*/

let MAX_PARTICLES;


if(!isMobile){

    /*
       Strong desktop:
       1,000,000 particles.
    */

    if(
        deviceMemory >= 8 ||
        hardwareThreads >= 8
    ){

        MAX_PARTICLES =
            1000000;

    }else{

        /*
           More modest desktop.
        */

        MAX_PARTICLES =
            700000;
    }

}else{

    /*
       Mobile adaptive density.
    */

    if(
        deviceMemory >= 6 &&
        hardwareThreads >= 8
    ){

        MAX_PARTICLES =
            250000;

    }else if(
        deviceMemory >= 4 ||
        hardwareThreads >= 6
    ){

        MAX_PARTICLES =
            160000;

    }else{

        MAX_PARTICLES =
            80000;
    }
}


/*
   Starting visible amount.

   This is what the user sees at the beginning of
   vehicle formation.
*/

const START_VISIBLE =
    Math.min(
        100000,
        MAX_PARTICLES
    );


/*
   Generation progresses through these density levels.
*/

const DENSITY_STAGES = [

    START_VISIBLE,

    Math.min(
        200000,
        MAX_PARTICLES
    ),

    Math.min(
        400000,
        MAX_PARTICLES
    ),

    Math.min(
        700000,
        MAX_PARTICLES
    ),

    MAX_PARTICLES
];


/* =========================================================
   COLORS
========================================================= */

const AQUA =
    [0,1,1];

const BLACK =
    [0,0,0];

const YELLOW =
    [1,.70,0];


/* =========================================================
   ENGINE STATE
========================================================= */

let mode =
    "none";


let renderer =
    null;

let scene =
    null;

let camera =
    null;

let controls =
    null;

let geometry =
    null;

let material =
    null;

let particleSystem =
    null;


/* =========================================================
   MAXIMUM ARRAYS
========================================================= */

const currentPositions =
    new Float32Array(
        MAX_PARTICLES * 3
    );

const targetPositions =
    new Float32Array(
        MAX_PARTICLES * 3
    );

const currentColors =
    new Float32Array(
        MAX_PARTICLES * 3
    );

const targetColors =
    new Float32Array(
        MAX_PARTICLES * 3
    );


/*
   Each particle receives a stable numeric ID.

   The shader uses it to determine whether that particle
   is currently visible.
*/

const particleIndices =
    new Float32Array(
        MAX_PARTICLES
    );


for(
    let i=0;
    i<MAX_PARTICLES;
    i++
){

    particleIndices[i] =
        i;
}


/* =========================================================
   INITIAL WATER / FOAM CLOUD
========================================================= */

for(
    let i=0;
    i<MAX_PARTICLES;
    i++
){

    const n =
        i*3;


    currentPositions[n] =
        (
            Math.random() -
            .5
        ) *
        100;


    currentPositions[n+1] =
        (
            Math.random() -
            .5
        ) *
        100;


    currentPositions[n+2] =
        (
            Math.random() -
            .5
        ) *
        100;


    currentColors[n] =
        AQUA[0];

    currentColors[n+1] =
        AQUA[1];

    currentColors[n+2] =
        AQUA[2];
}


targetPositions.set(
    currentPositions
);

targetColors.set(
    currentColors
);


/* =========================================================
   RUNTIME STATE
========================================================= */

let selectedCar =
    null;

let generating =
    false;

let whiteFormation =
    false;

let morphing =
    false;

let whiteStarted =
    0;

let morphStarted =
    0;

let targetParticleCount =
    START_VISIBLE;

let visibleParticleCount =
    START_VISIBLE;

let animationStarted =
    performance.now();


const firstViewed =
    {};


/* =========================================================
   PROGRESS
========================================================= */

function setProgress(
    value
){

    const p =
        Math.max(
            0,
            Math.min(
                100,
                Math.floor(
                    value
                )
            )
        );


    progressFill.style.width =
        p + "%";


    progressNumber.textContent =
        p + "%";
}


/* =========================================================
   PROGRESSIVE DENSITY
========================================================= */

function calculateVisibleDensity(
    progress
){

    /*
       progress:
           0 → 100

       Convert it into progressively denser stages.
    */

    const stageCount =
        DENSITY_STAGES.length;


    const scaled =
        (
            progress/100
        ) *
        (
            stageCount-1
        );


    const index =
        Math.min(
            stageCount-1,
            Math.floor(
                scaled
            )
        );


    const nextIndex =
        Math.min(
            stageCount-1,
            index+1
        );


    const local =
        scaled-index;


    const a =
        DENSITY_STAGES[index];


    const b =
        DENSITY_STAGES[nextIndex];


    return Math.floor(
        a+
        (
            b-a
        )*
        local
    );
}


/* =========================================================
   WEBGL SHADERS
========================================================= */

const vertexShader = `

uniform float uTime;
uniform float uMorph;
uniform float uWaterMotion;

uniform float uWhite;

uniform float uPixelRatio;
uniform float uViewportHeight;

uniform float uBubble;

uniform float uVisibleParticles;

attribute vec3 nextPosition;
attribute vec3 nextColor;

attribute float particleIndex;

varying vec3 vColor;

void main(){

    /*
       Hide particles that have not yet been activated.
    */

    if(
        particleIndex >=
        uVisibleParticles
    ){

        gl_PointSize =
            0.0;

        gl_Position =
            vec4(
                2.0,
                2.0,
                2.0,
                1.0
            );

        return;
    }


    vColor =
        mix(
            color,
            nextColor,
            uMorph
        );


    vec3 p =
        mix(
            position,
            nextPosition,
            uMorph
        );


    /*
       =====================================================
       INITIAL WATER / FOAM
       =====================================================
    */

    vec3 s =
        position;

    float t =
        uTime;


    vec3 flow =
        vec3(

            sin(
                s.x*.37+
                s.y*.13+
                t*1.08
            )
            +
            .42*
            sin(
                s.z*.21-
                t*.72
            ),

            sin(
                s.y*.29+
                s.z*.17-
                t*.91
            )
            +
            .37*
            sin(
                s.x*.19+
                t*.61
            ),

            sin(
                s.z*.31+
                s.x*.11+
                t*.82
            )
            +
            .34*
            sin(
                s.y*.23-
                t*.49
            )
        );


    p +=
        flow*
        .055*
        uWaterMotion*
        (
            1.0-uMorph
        );


    /*
       =====================================================
       SMALL AIR BUBBLE
       =====================================================
    */

    vec4 clip =
        projectionMatrix*
        modelViewMatrix*
        vec4(
            p,
            1.0
        );


    vec2 screen =
        clip.xy/
        max(
            abs(
                clip.w
            ),
            .0001
        );


    /*
       uBubble.x = pointer X
       uBubble.y = pointer Y
       encoded from the JavaScript side.
    */

    vec2 bubble=
        vec2(
            uBubble,
            0.0
        ).xy;


    vec2 delta =
        screen-bubble;


    float d =
        length(
            delta
        );


    float radius =
        .095;


    float pressure =
        smoothstep(
            radius,
            0.0,
            d
        );


    pressure *=
        .10*
        uWaterMotion*
        (
            1.0-uMorph
        );


    if(
        d>.0001 &&
        d<radius
    ){

        p +=
            normalize(
                delta
            )*
            pressure;
    }


    /*
       =====================================================
       FINAL POSITION
       =====================================================
    */

    vec4 mv =
        modelViewMatrix*
        vec4(
            p,
            1.0
        );


    gl_Position =
        projectionMatrix*
        mv;


    float size =
        4.3*
        (
            uViewportHeight/
            1080.0
        )*
        uPixelRatio;


    gl_PointSize =
        clamp(
            size,
            3.0,
            8.5
        );
}
`;


const fragmentShader = `

uniform float uWhite;

uniform float uMorph;

varying vec3 vColor;

void main(){

    float d =
        distance(
            gl_PointCoord,
            vec2(
                .5,
                .5
            )
        );


    if(
        d>.5
    ){

        discard;
    }


    vec3 finalColor =
        mix(
            vColor,
            vec3(
                1.0
            ),
            uWhite
        );


    /*
       Initial foam:
       aqua center + black edge.
    */

    if(
        uMorph<.5 &&
        uWhite<.75
    ){

        if(
            d>.34
        ){

            gl_FragColor =
                vec4(
                    0.0,
                    0.0,
                    0.0,
                    1.0
                );

        }else{

            float core =
                smoothstep(
                    .34,
                    .025,
                    d
                );


            gl_FragColor =
                vec4(
                    finalColor,
                    max(
                        core,
                        .94
                    )
                );
        }

    }else{

        float alpha =
            smoothstep(
                .5,
                .07,
                d
            );


        gl_FragColor =
            vec4(
                finalColor,
                max(
                    alpha,
                    .97
                )
            );
    }
}
`;


/* =========================================================
   WEBGL INIT
========================================================= */

function initializeWebGL(){

    try{

        renderer =
            new THREE.WebGLRenderer({

                antialias:
                    false,

                alpha:
                    false,

                precision:
                    "mediump",

                powerPreference:
                    "default"
            });


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio||1,
                isMobile?1.5:2
            )
        );


        renderer.setSize(
            stage.clientWidth,
            stage.clientHeight,
            false
        );


        renderer.setClearColor(
            0x1a1a1a,
            1
        );


        scene =
            new THREE.Scene();


        camera =
            new THREE.PerspectiveCamera(
                55,
                stage.clientWidth/
                Math.max(
                    stage.clientHeight,
                    1
                ),
                .1,
                300
            );


        camera.position.set(
            15.5,
            6.5,
            18.5
        );


        camera.lookAt(
            .2,
            1.25,
            0
        );


        controls =
            new THREE.OrbitControls(
                camera,
                renderer.domElement
            );


        controls.enableDamping =
            true;

        controls.dampingFactor =
            .065;

        controls.enablePan =
            false;

        controls.rotateSpeed =
            .75;

        controls.zoomSpeed =
            .8;

        controls.minDistance =
            7;

        controls.maxDistance =
            40;

        controls.target.set(
            .2,
            1.25,
            0
        );


        geometry =
            new THREE.BufferGeometry();


        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(
                currentPositions,
                3
            )
        );


        geometry.setAttribute(
            "nextPosition",
            new THREE.BufferAttribute(
                targetPositions,
                3
            )
        );


        geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(
                currentColors,
                3
            )
        );


        geometry.setAttribute(
            "nextColor",
            new THREE.BufferAttribute(
                targetColors,
                3
            )
        );


        geometry.setAttribute(
            "particleIndex",
            new THREE.BufferAttribute(
                particleIndices,
                1
            )
        );


        material =
            new THREE.ShaderMaterial({

                uniforms:{

                    uTime:{
                        value:0
                    },

                    uMorph:{
                        value:0
                    },

                    uWhite:{
                        value:0
                    },

                    uWaterMotion:{
                        value:1
                    },

                    uPixelRatio:{
                        value:
                            Math.min(
                                window.devicePixelRatio||1,
                                isMobile?1.5:2
                            )
                    },

                    uViewportHeight:{
                        value:
                            stage.clientHeight
                    },

                    uBubble:{
                        value:
                            new THREE.Vector2(
                                10,
                                10
                            )
                    },

                    uVisibleParticles:{
                        value:
                            START_VISIBLE
                    }
                },


                vertexColors:
                    true,


                vertexShader:
                    vertexShader,


                fragmentShader:
                    fragmentShader,


                transparent:
                    true,


                depthWrite:
                    false,


                depthTest:
                    true
            });


        particleSystem =
            new THREE.Points(
                geometry,
                material
            );


        scene.add(
            particleSystem
        );


        /*
           Mouse / touch bubble.
        */

        renderer
            .domElement
            .addEventListener(
                "pointermove",
                event=>{

                    const rect =
                        renderer
                        .domElement
                        .getBoundingClientRect();


                    material
                        .uniforms
                        .uBubble
                        .value
                        .set(

                            (
                                (
                                    event.clientX-
                                    rect.left
                                )/
                                rect.width
                            )*2-1,

                            -(
                                (
                                    (
                                        event.clientY-
                                        rect.top
                                    )/
                                    rect.height
                                )*2-1
                            )
                        );
                }
            );


        renderer
            .domElement
            .addEventListener(
                "pointerleave",
                ()=>{

                    material
                        .uniforms
                        .uBubble
                        .value
                        .set(
                            10,
                            10
                        );
                }
            );


        stage.insertBefore(
            renderer.domElement,
            stage.firstChild
        );


        mode =
            "webgl";


        return true;

    }catch(error){

        console.warn(
            "WebGL unavailable:",
            error
        );


        renderer =
            null;

        return false;
    }
}


/* =========================================================
   VEHICLE TARGET PREPARATION
========================================================= */

function prepareVehicle(
    model,
    finished
){

    const definition =
        window.ToyotaCars[
            model
        ];


    if(
        !definition ||
        typeof definition.build !==
        "function"
    ){

        console.error(
            "Vehicle module missing:",
            model
        );


        loading.style.display =
            "none";


        generating =
            false;


        buttons.forEach(
            button =>
                button.disabled =
                    false
        );


        return;
    }


    /*
       We deliberately build the FULL target shape.

       The particle visibility, however, starts at 100k and
       increases progressively during formation.

       This means the vehicle gets denser instead of the
       whole million-point buffer appearing instantly.
    */

    setProgress(1);


    requestAnimationFrame(
        ()=>{

            let vehicle;


            try{

                vehicle =
                    definition.build(
                        MAX_PARTICLES
                    );

            }catch(error){

                console.error(
                    "Vehicle creation failed:",
                    error
                );


                loading.style.display =
                    "none";


                generating =
                    false;


                buttons.forEach(
                    button =>
                        button.disabled =
                            false
                );


                return;
            }


            setProgress(20);


            requestAnimationFrame(
                ()=>{

                    targetPositions.set(
                        vehicle.positions
                    );


                    targetColors.set(
                        vehicle.colors
                    );


                    geometry
                        .getAttribute(
                            "nextPosition"
                        )
                        .needsUpdate =
                            true;


                    geometry
                        .getAttribute(
                            "nextColor"
                        )
                        .needsUpdate =
                            true;


                    /*
                       We are not changing the visible
                       density yet. The formation itself will
                       increase the density.
                    */

                    setProgress(100);


                    requestAnimationFrame(
                        finished
                    );
                }
            );
        }
    );
}


/* =========================================================
   START VEHICLE
========================================================= */

function startVehicle(
    model
){

    selectedCar =
        model;


    /*
       Stop water motion.

       From this moment particles travel to their
       predetermined target rather than continuing
       to scatter.
    */

    material
        .uniforms
        .uWaterMotion
        .value =
            0;


    material
        .uniforms
        .uMorph
        .value =
            0;


    material
        .uniforms
        .uWhite
        .value =
            0;


    /*
       Start with only 100k particles visible.
    */

    visibleParticleCount =
        START_VISIBLE;


    targetParticleCount =
        MAX_PARTICLES;


    material
        .uniforms
        .uVisibleParticles
        .value =
            visibleParticleCount;


    /*
       First time a particular model is shown:
       white transition first.
    */

    if(
        !firstViewed[model]
    ){

        firstViewed[model] =
            true;

        whiteFormation =
            true;

        morphing =
            false;

        whiteStarted =
            performance.now();

    }else{

        beginMorph();
    }
}


/* =========================================================
   MORPH
========================================================= */

function beginMorph(){

    whiteFormation =
        false;

    morphing =
        true;

    morphStarted =
        performance.now();


    material
        .uniforms
        .uWhite
        .value =
            1;


    material
        .uniforms
        .uMorph
        .value =
            0;
}


/* =========================================================
   BUTTONS
========================================================= */

buttons.forEach(
    button=>{

        button.addEventListener(
            "click",
            ()=>{

                if(
                    generating ||
                    whiteFormation ||
                    morphing
                ){

                    return;
                }


                buttons.forEach(
                    b=>{

                        b.disabled =
                            true;

                        b.classList.remove(
                            "active"
                        );
                    }
                );


                button.classList.add(
                    "active"
                );


                const model =
                    button.dataset.car;


                generating =
                    true;


                selectedCar =
                    null;


                loading.style.display =
                    "block";


                setProgress(0);


                prepareVehicle(
                    model,
                    ()=>{

                        generating =
                            false;


                        buttons.forEach(
                            b =>
                                b.disabled =
                                    false
                        );


                        startVehicle(
                            model
                        );
                    }
                );
            }
        );
    }
);


/* =========================================================
   MAIN WEBGL ANIMATION
========================================================= */

function animate(){

    requestAnimationFrame(
        animate
    );


    const now =
        performance.now();


    material
        .uniforms
        .uTime
        .value =
            (
                now -
                animationStarted
            )/
            1000;


    /*
       =====================================================
       WHITE FORMATION
       =====================================================
    */

    if(
        whiteFormation
    ){

        const raw =
            Math.min(
                (
                    now -
                    whiteStarted
                )/
                650,
                1
            );


        const smooth =
            raw*raw*
            (
                3-2*raw
            );


        material
            .uniforms
            .uWhite
            .value =
                smooth;


        /*
           While becoming white, slowly begin increasing
           the particle density.
        */

        visibleParticleCount =
            Math.max(
                START_VISIBLE,
                calculateVisibleDensity(
                    raw*25
                )
            );


        material
            .uniforms
            .uVisibleParticles
            .value =
                visibleParticleCount;


        if(
            raw>=1
        ){

            beginMorph();
        }
    }


    /*
       =====================================================
       VEHICLE MORPH
       =====================================================
    */

    if(
        morphing
    ){

        const raw =
            Math.min(
                (
                    now -
                    morphStarted
                )/
                3600,
                1
            );


        const eased =
            raw<.5

            ?4*
             raw*
             raw*
             raw

            :1-
             Math.pow(
                 -2*raw+2,
                 3
             )/
             2;


        material
            .uniforms
            .uMorph
            .value =
                eased;


        /*
           White fades into real car colors.
        */

        material
            .uniforms
            .uWhite
            .value =
                Math.max(
                    0,
                    1-
                    raw/.40
                );


        /*
           THIS IS THE IMPORTANT PART.

           Density rises during the actual image
           formation.

           0%   → ~100k
           25%  → ~200k
           50%  → ~400k
           75%  → ~700k
           100% → maximum
        */

        visibleParticleCount =
            calculateVisibleDensity(
                raw*100
            );


        material
            .uniforms
            .uVisibleParticles
            .value =
                visibleParticleCount;


        setProgress(
            raw*100
        );


        if(
            raw>=1
        ){

            morphing =
                false;


            /*
               FINAL PARTICLE POSITION LOCK.
            */

            currentPositions.set(
                targetPositions
            );


            currentColors.set(
                targetColors
            );


            geometry
                .getAttribute(
                    "position"
                )
                .needsUpdate =
                    true;


            geometry
                .getAttribute(
                    "color"
                )
                .needsUpdate =
                    true;


            /*
               Every generated particle is now visible.
            */

            visibleParticleCount =
                MAX_PARTICLES;


            material
                .uniforms
                .uVisibleParticles
                .value =
                    MAX_PARTICLES;


            material
                .uniforms
                .uMorph
                .value =
                    0;


            material
                .uniforms
                .uWhite
                .value =
                    0;


            /*
               Completely freeze the vehicle.
            */

            material
                .uniforms
                .uWaterMotion
                .value =
                    0;


            material
                .uniforms
                .uBubble
                .value
                .set(
                    10,
                    10
                );


            setProgress(100);


            setTimeout(
                ()=>{
                    loading.style.display =
                        "none";
                },
                220
            );
        }
    }


    /*
       =====================================================
       NO MODEL SELECTED
       =====================================================

       Entire 100x100x100 cloud remains alive.
    */

    if(
        !selectedCar &&
        !generating
    ){

        particleSystem.rotation.y =
            Math.sin(
                now*.00008
            )*.03;


        particleSystem.rotation.x =
            Math.sin(
                now*.00005
            )*.015;

    }else{

        particleSystem.rotation.y =
            0;

        particleSystem.rotation.x =
            0;
    }


    controls.update();


    renderer.render(
        scene,
        camera
    );
}


/* =========================================================
   RESIZE
========================================================= */

window.addEventListener(
    "resize",
    ()=>{

        if(
            mode !==
            "webgl"
        ){

            return;
        }


        const width =
            stage.clientWidth;


        const height =
            Math.max(
                1,
                stage.clientHeight
            );


        camera.aspect =
            width/height;


        camera.updateProjectionMatrix();


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio||1,
                isMobile?1.5:2
            )
        );


        renderer.setSize(
            width,
            height,
            false
        );


        material
            .uniforms
            .uPixelRatio
            .value =
                Math.min(
                    window.devicePixelRatio||1,
                    isMobile?1.5:2
                );


        material
            .uniforms
            .uViewportHeight
            .value =
                height;
    }
);


/* =========================================================
   START
========================================================= */

if(
    initializeWebGL()
){

    animate();

}else{

    /*
       WebGL is genuinely unavailable.

       The existing project architecture can use its
       Canvas fallback here if you keep that fallback in
       your initial.js.

       We intentionally do not attempt 1,000,000 Canvas
       particles because that would destroy mobile
       performance.
    */

    const message =
        document.createElement(
            "div"
        );


    message.style.cssText =
        `
        position:absolute;
        inset:0;

        display:flex;
        align-items:center;
        justify-content:center;

        padding:30px;

        color:#00ffff;

        text-align:center;

        font-size:14px;
        `;


    message.textContent =
        "GPU rendering is unavailable on this device.";

    stage.appendChild(
        message
    );
}