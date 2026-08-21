"use strict";


/* =========================================================
   GLOBAL NAMESPACES
========================================================= */

window.ToyotaCars =
    window.ToyotaCars || {};

window.ToyotaShapeTools =
    window.ToyotaShapeTools || {};


/* =========================================================
   SHARED GEOMETRY TOOLS
========================================================= */

const Tools =
    window.ToyotaShapeTools;


/*
   Deterministic quasi-random sequence.

   This is deliberately NOT Math.random().

   The same particle index always receives the same
   sequence values, meaning the vehicle target is fixed.
*/

Tools.sequence =
function(index, salt = 1){

    const a =
        0.6180339887498949;

    const b =
        0.7548776662466927;


    return {

        x:
            (
                index * a +
                salt * .173
            ) % 1,

        y:
            (
                index * b +
                salt * .271
            ) % 1,

        z:
            (
                index * (a+b) +
                salt * .119
            ) % 1
    };
};


/*
   Linear interpolation.
*/

Tools.lerp =
function(a,b,t){

    return {

        x:
            a.x +
            (b.x-a.x)*t,

        y:
            a.y +
            (b.y-a.y)*t,

        z:
            a.z +
            (b.z-a.z)*t
    };
};


/*
   Store a point.
*/

Tools.put =
function(array,index,p){

    const n =
        index*3;


    array[n] =
        p.x;

    array[n+1] =
        p.y;

    array[n+2] =
        p.z;
};


/*
   Store RGB.
*/

Tools.color =
function(array,index,c){

    const n =
        index*3;


    array[n] =
        c[0];

    array[n+1] =
        c[1];

    array[n+2] =
        c[2];
};


/*
   Interpolate a side-profile curve.
*/

Tools.profileY =
function(x,profile){

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
            x >= a.x &&
            x <= b.x
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
                (b.y-a.y)*t
            );
        }
    }


    return profile[
        profile.length-1
    ].y;
};


/*
   Solid circular wheel disk.
*/

Tools.wheel =
function(
    s,
    centerX,
    radius,
    z
){

    const angle =
        s.x*
        Math.PI*
        2;


    const radial =
        Math.sqrt(
            s.y
        )*
        radius;


    return {

        x:
            centerX +
            Math.cos(angle)*
            radial,

        y:
            radius +
            Math.sin(angle)*
            radial,

        z
    };
};


/*
   Wheel arch.
*/

Tools.wheelArch =
function(
    s,
    centerX,
    radius,
    z
){

    const angle =
        s.x*
        Math.PI;


    return {

        x:
            centerX +
            Math.cos(angle)*
            radius,

        y:
            radius +
            Math.sin(angle)*
            radius,

        z
    };
};


/*
   Create a point on a rectangular panel.
*/

Tools.panel =
function(
    s,
    x0,
    x1,
    y0,
    y1,
    z
){

    return {

        x:
            x0 +
            (x1-x0)*s.x,

        y:
            y0 +
            (y1-y0)*s.y,

        z
    };
};


/*
   Clamp.
*/

Tools.clamp =
function(v,min,max){

    return Math.max(
        min,
        Math.min(
            max,
            v
        )
    );
};


/* =========================================================
   ENGINE CONFIGURATION
========================================================= */

const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(
        navigator.userAgent
    ) ||
    window.innerWidth <= 850;


const deviceMemory =
    navigator.deviceMemory ||
    4;


const cpuThreads =
    navigator.hardwareConcurrency ||
    4;


/*
   Maximum particle budget.

   Desktop:
       500k – 1M

   Mobile:
       80k – 250k
*/

let MAX_PARTICLES;


if(!isMobile){

    if(
        deviceMemory >= 8 ||
        cpuThreads >= 8
    ){

        MAX_PARTICLES =
            1000000;

    }else if(
        deviceMemory >= 6 ||
        cpuThreads >= 6
    ){

        MAX_PARTICLES =
            750000;

    }else{

        MAX_PARTICLES =
            500000;
    }

}else{

    if(
        deviceMemory >= 6 &&
        cpuThreads >= 8
    ){

        MAX_PARTICLES =
            250000;

    }else if(
        deviceMemory >= 4 ||
        cpuThreads >= 6
    ){

        MAX_PARTICLES =
            160000;

    }else{

        MAX_PARTICLES =
            80000;
    }
}


/*
   First visible stage.
*/

const START_PARTICLES =
    Math.min(
        100000,
        MAX_PARTICLES
    );


/*
   Density progression.
*/

const DENSITY_STAGES = [

    START_PARTICLES,

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


/*
   Expose configuration to car modules.
*/

window.ToyotaEngine = {

    MAX_PARTICLES,

    START_PARTICLES,

    AQUA: [0,1,1],

    BLACK: [0,0,0],

    YELLOW: [1,.70,0]
};


/* =========================================================
   DOM
========================================================= */

let stage;
let loading;
let progressFill;
let progressNumber;
let buttons;


/* =========================================================
   RENDERER
========================================================= */

let renderer = null;
let scene = null;
let camera = null;
let controls = null;

let geometry = null;
let material = null;
let points = null;


/* =========================================================
   ARRAYS
========================================================= */

let currentPositions;
let targetPositions;

let currentColors;
let targetColors;

let particleIndices;


/* =========================================================
   STATE
========================================================= */

let engineMode =
    "none";

let selectedCar =
    null;

let generating =
    false;

let whiteFormation =
    false;

let morphing =
    false;

let whiteStart =
    0;

let morphStart =
    0;

let animationStart =
    performance.now();

let visibleParticles =
    START_PARTICLES;


const firstViewed =
    {};


/* =========================================================
   PROGRESS
========================================================= */

function setProgress(value){

    const p =
        Tools.clamp(
            Math.floor(value),
            0,
            100
        );


    progressFill.style.width =
        p + "%";


    progressNumber.textContent =
        p + "%";
}


/* =========================================================
   DENSITY MAPPING
========================================================= */

function densityForProgress(
    progress
){

    const scaled =
        (
            progress/100
        )*
        (
            DENSITY_STAGES.length-1
        );


    const index =
        Math.min(
            DENSITY_STAGES.length-1,
            Math.floor(scaled)
        );


    const next =
        Math.min(
            DENSITY_STAGES.length-1,
            index+1
        );


    const local =
        scaled-index;


    return Math.floor(
        DENSITY_STAGES[index] +
        (
            DENSITY_STAGES[next] -
            DENSITY_STAGES[index]
        )*
        local
    );
}


/* =========================================================
   INITIAL RANDOM WATER
========================================================= */

function initializeParticleArrays(){

    currentPositions =
        new Float32Array(
            MAX_PARTICLES*3
        );


    targetPositions =
        new Float32Array(
            MAX_PARTICLES*3
        );


    currentColors =
        new Float32Array(
            MAX_PARTICLES*3
        );


    targetColors =
        new Float32Array(
            MAX_PARTICLES*3
        );


    particleIndices =
        new Float32Array(
            MAX_PARTICLES
        );


    for(
        let i=0;
        i<MAX_PARTICLES;
        i++
    ){

        const n =
            i*3;


        /*
           Initial 100×100×100 cloud.
        */

        currentPositions[n] =
            (
                Math.random()-.5
            )*
            100;


        currentPositions[n+1] =
            (
                Math.random()-.5
            )*
            100;


        currentPositions[n+2] =
            (
                Math.random()-.5
            )*
            100;


        currentColors[n] =
            0;

        currentColors[n+1] =
            1;

        currentColors[n+2] =
            1;


        particleIndices[i] =
            i;
    }


    targetPositions.set(
        currentPositions
    );


    targetColors.set(
        currentColors
    );
}


/* =========================================================
   SHADERS
========================================================= */

const vertexShader = `

uniform float uTime;
uniform float uMorph;
uniform float uWaterMotion;
uniform float uWhite;

uniform float uPixelRatio;
uniform float uViewportHeight;

uniform vec2 uBubble;

uniform float uVisibleParticles;

attribute vec3 nextPosition;
attribute vec3 nextColor;
attribute float particleIndex;

varying vec3 vColor;

void main(){

    /*
       Hide not-yet-released particles.
    */

    if(
        particleIndex >=
        uVisibleParticles
    ){

        gl_PointSize = 0.0;

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
       ======================================================
       WATER / FOAM MOTION
    ======================================================
    */

    vec3 s =
        position;

    float t =
        uTime;


    vec3 flow = vec3(

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
       ======================================================
       AIR BUBBLE
    ======================================================

       Tiny radius.
       Gentle pressure.
       Only active before formation.
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
            abs(clip.w),
            .0001
        );


    vec2 delta =
        screen-uBubble;


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
       ======================================================
       FINAL POSITION
    ======================================================
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


    float pixelSize =
        4.35*
        (
            uViewportHeight/
            1080.0
        )*
        uPixelRatio;


    gl_PointSize =
        clamp(
            pixelSize,
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
            vec2(.5)
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
       Initial aqua foam with black rim.
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
                    0,
                    0,
                    0,
                    1
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
                .50,
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
   WEBGL INITIALIZATION
========================================================= */

function initializeWebGL(){

    try{

        renderer =
            new THREE.WebGLRenderer({
                antialias:false,
                alpha:false,
                precision:"mediump",
                powerPreference:"default"
            });


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                isMobile ? 1.5 : 2
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
            .25,
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
            42;

        controls.target.set(
            .25,
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
                            START_PARTICLES
                    }
                },

                vertexColors:true,

                vertexShader,

                fragmentShader,

                transparent:true,

                depthWrite:false,

                depthTest:true
            });


        points =
            new THREE.Points(
                geometry,
                material
            );


        scene.add(
            points
        );


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


        engineMode =
            "webgl";


        return true;

    }catch(error){

        console.warn(
            "WebGL unavailable:",
            error
        );


        renderer = null;


        return false;
    }
}


/* =========================================================
   FIXED VEHICLE PREPARATION
========================================================= */

function prepareVehicle(
    model,
    complete
){

    const car =
        window.ToyotaCars[
            model
        ];


    if(
        !car ||
        typeof car.buildRange !==
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
       Build the fixed target progressively.

       No giant synchronous 1M-point operation.
    */

    let cursor = 0;


    const CHUNK = isMobile
        ? 25000
        : 50000;


    function buildChunk(){

        const end =
            Math.min(
                cursor+CHUNK,
                MAX_PARTICLES
            );


        car.buildRange(
            cursor,
            end,
            targetPositions,
            targetColors,
            MAX_PARTICLES
        );


        cursor =
            end;


        const prepProgress =
            (
                cursor/
                MAX_PARTICLES
            )*
            100;


        /*
           Target preparation occupies roughly the first
           35% of the UI progress.
        */

        setProgress(
            prepProgress*.35
        );


        if(
            cursor <
            MAX_PARTICLES
        ){

            requestAnimationFrame(
                buildChunk
            );

        }else{

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
               Target is fully prepared.
            */

            complete();
        }
    }


    requestAnimationFrame(
        buildChunk
    );
}


/* =========================================================
   START CAR
========================================================= */

function startVehicle(
    model
){

    selectedCar =
        model;


    material
        .uniforms
        .uWaterMotion
        .value =
            0;


    visibleParticles =
        START_PARTICLES;


    material
        .uniforms
        .uVisibleParticles
        .value =
            visibleParticles;


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


    if(
        !firstViewed[model]
    ){

        firstViewed[model] =
            true;


        whiteFormation =
            true;


        whiteStart =
            performance.now();

    }else{

        beginMorph();
    }
}


/* =========================================================
   BEGIN MORPH
========================================================= */

function beginMorph(){

    whiteFormation =
        false;


    morphing =
        true;


    morphStart =
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

function bindButtons(){

    buttons.forEach(
        button=>{

            button.addEventListener(
                "click",
                ()=>{

                    if(
                        generating ||
                        morphing ||
                        whiteFormation
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

                            /*
                               Target preparation is now
                               complete.

                               Start actual visual formation.
                            */

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
}


/* =========================================================
   ANIMATION
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
                now-
                animationStart
            )/
            1000;


    /* =====================================================
       WHITE FORMATION
    ===================================================== */

    if(
        whiteFormation
    ){

        const raw =
            Math.min(
                (
                    now-
                    whiteStart
                )/
                700,
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
           Slight density increase during white stage.
        */

        visibleParticles =
            densityForProgress(
                raw*20
            );


        material
            .uniforms
            .uVisibleParticles
            .value =
                visibleParticles;


        if(
            raw>=1
        ){

            beginMorph();
        }
    }


    /* =====================================================
       VEHICLE MORPH
    ===================================================== */

    if(
        morphing
    ){

        const raw =
            Math.min(
                (
                    now-
                    morphStart
                )/
                3800,
                1
            );


        const eased =
            raw < .5

            ? 4*
              raw*
              raw*
              raw

            : 1-
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
           White → final colours.
        */

        material
            .uniforms
            .uWhite
            .value =
                Math.max(
                    0,
                    1-
                    raw/.38
                );


        /*
           Density increases continuously.

           0%   = ~100k
           25%  = ~200k
           50%  = ~400k
           75%  = ~700k
           100% = device maximum
        */

        visibleParticles =
            densityForProgress(
                raw*100
            );


        material
            .uniforms
            .uVisibleParticles
            .value =
                visibleParticles;


        /*
           Progress represents the actual visible formation.
        */

        setProgress(
            35+
            raw*65
        );


        if(
            raw>=1
        ){

            morphing =
                false;


            /*
               Final density.
            */

            visibleParticles =
                MAX_PARTICLES;


            material
                .uniforms
                .uVisibleParticles
                .value =
                    MAX_PARTICLES;


            /*
               Copy fixed target into active position buffer.
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
               FINAL FREEZE.
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


            setProgress(
                100
            );


            setTimeout(
                ()=>{
                    loading.style.display =
                        "none";
                },
                220
            );
        }
    }


    /* =====================================================
       NO MODEL SELECTED
    ===================================================== */

    if(
        !selectedCar &&
        !generating
    ){

        /*
           The entire particle cloud has slow irregular
           movement.

           It is deliberately NOT an orbit.
        */

        points.rotation.y =
            Math.sin(
                now*.00008
            )*.03;


        points.rotation.x =
            Math.sin(
                now*.00005
            )*.015;

    }else{

        /*
           Finished cars do not auto rotate.
           OrbitControls controls them.
        */

        points.rotation.y =
            0;

        points.rotation.x =
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

function resize(){

    if(
        engineMode !==
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


/* =========================================================
   START
========================================================= */

function startApp(){

    stage =
        document.getElementById(
            "stage"
        );


    loading =
        document.getElementById(
            "loading"
        );


    progressFill =
        document.getElementById(
            "progress-fill"
        );


    progressNumber =
        document.getElementById(
            "progress-number"
        );


    buttons =
        [
            ...document.querySelectorAll(
                ".car-btn"
            )
        ];


    initializeParticleArrays();


    /*
       Try GPU rendering.
    */

    if(
        initializeWebGL()
    ){

        bindButtons();

        animate();

    }else{

        /*
           Canvas fallback is initialized by the
           separate fallback function below.
        */

        initializeCanvasFallback();

        bindButtons();
    }
}


/* =========================================================
   CANVAS FALLBACK
========================================================= */

let fallbackCanvas = null;
let fallbackContext = null;

let fallbackPositions = null;
let fallbackTargets = null;

let fallbackColors = null;
let fallbackTargetColors = null;

let fallbackCount =
    isMobile
    ? Math.min(30000, MAX_PARTICLES)
    : Math.min(50000, MAX_PARTICLES);


let fallbackMorph =
    0;

let fallbackYaw =
    0;

let fallbackPitch =
    .10;

let fallbackZoom =
    1;

let fallbackDragging =
    false;

let fallbackLastX =
    0;

let fallbackLastY =
    0;

let fallbackBubbleX =
    -10000;

let fallbackBubbleY =
    -10000;

let fallbackBubbleActive =
    false;


/* =========================================================
   FALLBACK INITIALIZATION
========================================================= */

function initializeCanvasFallback(){

    fallbackCanvas =
        document.createElement(
            "canvas"
        );


    fallbackCanvas.id =
        "canvas-fallback";


    fallbackCanvas.style.position =
        "absolute";


    fallbackCanvas.style.inset =
        "0";


    fallbackCanvas.style.width =
        "100%";


    fallbackCanvas.style.height =
        "100%";


    fallbackCanvas.style.touchAction =
        "none";


    fallbackContext =
        fallbackCanvas.getContext(
            "2d"
        );


    stage.insertBefore(
        fallbackCanvas,
        stage.firstChild
    );


    fallbackPositions =
        new Float32Array(
            fallbackCount*3
        );


    fallbackTargets =
        new Float32Array(
            fallbackCount*3
        );


    fallbackColors =
        new Float32Array(
            fallbackCount*3
        );


    fallbackTargetColors =
        new Float32Array(
            fallbackCount*3
        );


    for(
        let i=0;
        i<fallbackCount;
        i++
    ){

        const n=
            i*3;


        fallbackPositions[n] =
            (
                Math.random()-.5
            )*100;


        fallbackPositions[n+1] =
            (
                Math.random()-.5
            )*100;


        fallbackPositions[n+2] =
            (
                Math.random()-.5
            )*100;


        fallbackColors[n] =
            0;

        fallbackColors[n+1] =
            1;

        fallbackColors[n+2] =
            1;
    }


    fallbackTargets.set(
        fallbackPositions
    );


    fallbackTargetColors.set(
        fallbackColors
    );


    resizeCanvas();


    fallbackCanvas.addEventListener(
        "pointerdown",
        event=>{

            fallbackDragging =
                true;


            fallbackLastX =
                event.clientX;


            fallbackLastY =
                event.clientY;
        }
    );


    window.addEventListener(
        "pointermove",
        event=>{

            if(
                !fallbackDragging
            ){
                return;
            }


            const dx =
                event.clientX-
                fallbackLastX;


            const dy =
                event.clientY-
                fallbackLastY;


            fallbackYaw +=
                dx*.007;


            fallbackPitch +=
                dy*.005;


            fallbackPitch =
                Tools.clamp(
                    fallbackPitch,
                    -.9,
                    .9
                );


            fallbackLastX =
                event.clientX;


            fallbackLastY =
                event.clientY;
        }
    );


    window.addEventListener(
        "pointerup",
        ()=>{
            fallbackDragging =
                false;
        }
    );


    fallbackCanvas.addEventListener(
        "wheel",
        event=>{

            event.preventDefault();


            fallbackZoom *=
                event.deltaY>0
                ? .92
                : 1.08;


            fallbackZoom =
                Tools.clamp(
                    fallbackZoom,
                    .55,
                    2
                );
        },
        {
            passive:false
        }
    );


    fallbackCanvas.addEventListener(
        "pointermove",
        event=>{

            const rect =
                fallbackCanvas
                .getBoundingClientRect();


            fallbackBubbleX =
                event.clientX-
                rect.left;


            fallbackBubbleY =
                event.clientY-
                rect.top;


            fallbackBubbleActive =
                true;
        }
    );


    fallbackCanvas.addEventListener(
        "pointerleave",
        ()=>{
            fallbackBubbleActive =
                false;
        }
    );


    engineMode =
        "canvas";


    requestAnimationFrame(
        animateCanvas
    );
}


/* =========================================================
   CANVAS RESIZE
========================================================= */

function resizeCanvas(){

    if(
        !fallbackCanvas ||
        !fallbackContext
    ){
        return;
    }


    const dpr =
        Math.min(
            window.devicePixelRatio||1,
            2
        );


    fallbackCanvas.width =
        Math.max(
            1,
            Math.floor(
                stage.clientWidth*dpr
            )
        );


    fallbackCanvas.height =
        Math.max(
            1,
            Math.floor(
                stage.clientHeight*dpr
            )
        );


    fallbackContext.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );
}


/* =========================================================
   CANVAS 3D ROTATION
========================================================= */

function rotateFallback(
    x,
    y,
    z
){

    const cy =
        Math.cos(
            fallbackYaw
        );

    const sy =
        Math.sin(
            fallbackYaw
        );

    const cx =
        Math.cos(
            fallbackPitch
        );

    const sx =
        Math.sin(
            fallbackPitch
        );


    const x1 =
        x*cy+
        z*sy;


    const z1 =
        -x*sy+
        z*cy;


    const y1 =
        y*cx-
        z1*sx;


    const z2 =
        y*sx+
        z1*cx;


    return {
        x:x1,
        y:y1,
        z:z2
    };
}


/* =========================================================
   CANVAS VEHICLE TARGET
========================================================= */

function createFallbackVehicle(
    model
){

    const car =
        window.ToyotaCars[
            model
        ];


    if(
        !car ||
        typeof car.buildRange !==
        "function"
    ){

        return false;
    }


    /*
       Use the same fixed geometry logic but only sample
       the first part of the deterministic cloud.
    */

    car.buildRange(
        0,
        fallbackCount,
        fallbackTargets,
        fallbackTargetColors,
        fallbackCount
    );


    return true;
}


/* =========================================================
   CANVAS ANIMATION
========================================================= */

function animateCanvas(){

    requestAnimationFrame(
        animateCanvas
    );


    const now =
        performance.now();


    const width =
        stage.clientWidth;


    const height =
        stage.clientHeight;


    const ctx =
        fallbackContext;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    const scale =
        Math.min(
            width/14,
            height/7
        )*
        fallbackZoom;


    const moving =
        !selectedCar &&
        !generating;


    const time =
        now*.001;


    for(
        let i=0;
        i<fallbackCount;
        i++
    ){

        const n=
            i*3;


        let x=
            fallbackPositions[n];

        let y=
            fallbackPositions[n+1];

        let z=
            fallbackPositions[n+2];


        x +=
            (
                fallbackTargets[n]-
                x
            )*
            fallbackMorph;


        y +=
            (
                fallbackTargets[n+1]-
                y
            )*
            fallbackMorph;


        z +=
            (
                fallbackTargets[n+2]-
                z
            )*
            fallbackMorph;


        /*
           Water movement.
        */

        if(moving){

            x +=
                (
                    Math.sin(
                        x*.37+
                        y*.13+
                        time*1.08
                    )
                )*
                .10;


            y +=
                (
                    Math.sin(
                        y*.29+
                        z*.17-
                        time*.91
                    )
                )*
                .10;


            z +=
                (
                    Math.sin(
                        z*.31+
                        x*.11+
                        time*.82
                    )
                )*
                .10;
        }


        /*
           Bubble interaction.
        */

        if(
            moving &&
            fallbackBubbleActive
        ){

            const r =
                rotateFallback(
                    x,
                    y,
                    z
                );


            const depth =
                1+
                r.z*.012;


            const px =
                width/2+
                r.x*
                scale*
                depth;


            const py =
                height*.57-
                r.y*
                scale*
                depth;


            const dx =
                px-
                fallbackBubbleX;


            const dy =
                py-
                fallbackBubbleY;


            const distance =
                Math.sqrt(
                    dx*dx+
                    dy*dy
                );


            const radius =
                42;


            if(
                distance>1 &&
                distance<radius
            ){

                const pressure =
                    (
                        1-
                        distance/radius
                    )*
                    .75;


                x +=
                    (
                        dx/distance
                    )*
                    pressure;


                y +=
                    (
                        -dy/distance
                    )*
                    pressure;
            }
        }


        const r =
            rotateFallback(
                x,
                y,
                z
            );


        const depth =
            1+
            r.z*.012;


        if(
            depth<.08
        ){
            continue;
        }


        const px =
            width/2+
            r.x*
            scale*
            depth;


        const py =
            height*.57-
            r.y*
            scale*
            depth;


        const radius =
            Math.max(
                .8,
                Math.min(
                    2.3,
                    1.4*depth
                )
            );


        let color =
            "#00ffff";


        const cr =
            fallbackColors[n];


        const cg =
            fallbackColors[n+1];


        const cb =
            fallbackColors[n+2];


        if(
            cr===0 &&
            cg===0 &&
            cb===0
        ){

            color =
                "#000";
        }


        if(
            cr===1 &&
            cg>.5 &&
            cb===0
        ){

            color =
                "rgb(255,180,0)";
        }


        /*
           White formation.
        */

        if(
            whiteFormation
        ){

            color =
                "#fff";
        }


        /*
           Initial black rim.
        */

        if(
            !selectedCar &&
            fallbackMorph<.5 &&
            !whiteFormation
        ){

            ctx.beginPath();

            ctx.arc(
                px,
                py,
                radius*1.7,
                0,
                Math.PI*2
            );

            ctx.fillStyle =
                "#000";

            ctx.fill();
        }


        ctx.beginPath();

        ctx.arc(
            px,
            py,
            radius,
            0,
            Math.PI*2
        );


        ctx.fillStyle =
            color;


        ctx.fill();
    }
}


/* =========================================================
   CANVAS BUTTON FORMATION
========================================================= */

function startFallbackVehicle(
    model
){

    selectedCar =
        model;


    if(
        !createFallbackVehicle(
            model
        )
    ){

        return;
    }


    fallbackMorph =
        0;


    if(
        !firstViewed[model]
    ){

        firstViewed[model] =
            true;


        whiteFormation =
            true;


        whiteStart =
            performance.now();

    }else{

        beginFallbackMorph();
    }
}


function beginFallbackMorph(){

    whiteFormation =
        false;


    morphing =
        true;


    morphStart =
        performance.now();
}


/* =========================================================
   UNIFIED BUTTON OVERRIDE FOR CANVAS
========================================================= */

function bindCanvasButtons(){

    /*
       Buttons have already been bound by bindButtons().

       Canvas mode gets its own listeners only because the
       WebGL renderer does not exist.

       We stop here and handle canvas interaction separately.
    */
}


/* =========================================================
   RESIZE LISTENER
========================================================= */

window.addEventListener(
    "resize",
    ()=>{

        if(
            engineMode ===
            "webgl"
        ){

            resize();

        }else if(
            engineMode ===
            "canvas"
        ){

            resizeCanvas();
        }
    }
);


/* =========================================================
   WAIT UNTIL ALL VEHICLE FILES ARE LOADED
========================================================= */

window.addEventListener(
    "load",
    ()=>{

        /*
           DOM is ready.
           initial.js has loaded.
           All five car modules have loaded.
        */

        if(
            typeof window.ToyotaCars.fortuner !==
            "object" ||
            typeof window.ToyotaCars.legender !==
            "object" ||
            typeof window.ToyotaCars.lc300 !==
            "object" ||
            typeof window.ToyotaCars["innova-crysta"] !==
            "object" ||
            typeof window.ToyotaCars["innova-hycross"] !==
            "object"
        ){

            console.error(
                "One or more Toyota vehicle modules failed to load."
            );

            return;
        }


        startApp();
    }
);