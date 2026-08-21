"use strict";


/* =========================================================
   TOYOTA PARTICLE ENGINE
   WebGL optional
   Canvas 2D guaranteed fallback
========================================================= */

window.ToyotaCars =
    window.ToyotaCars || {};

window.ToyotaShapeTools =
    window.ToyotaShapeTools || {};


/* =========================================================
   COMMON TOOLS USED BY THE 5 CAR MODULES
========================================================= */

const Tools =
    window.ToyotaShapeTools;


/*
   Deterministic sequence.

   IMPORTANT:
   Car modules use this to create FIXED particle
   coordinates. There is no random target generation.
*/

Tools.sequence = function(index, salt = 1){

    const a = 0.6180339887498949;
    const b = 0.7548776662466927;

    return {
        x:
            (index*a + salt*.173) % 1,

        y:
            (index*b + salt*.271) % 1,

        z:
            (index*(a+b) + salt*.119) % 1
    };
};


Tools.put = function(
    array,
    index,
    point
){

    const n=index*3;

    array[n]=point.x;
    array[n+1]=point.y;
    array[n+2]=point.z;
};


Tools.color = function(
    array,
    index,
    color
){

    const n=index*3;

    array[n]=color[0];
    array[n+1]=color[1];
    array[n+2]=color[2];
};


Tools.wheel = function(
    sequence,
    centerX,
    radius,
    z
){

    const angle =
        sequence.x*
        Math.PI*
        2;

    const radial =
        Math.sqrt(
            sequence.y
        )*
        radius;

    return {

        x:
            centerX+
            Math.cos(angle)*
            radial,

        y:
            radius+
            Math.sin(angle)*
            radial,

        z
    };
};


Tools.profileY = function(
    x,
    profile
){

    for(
        let i=0;
        i<profile.length-1;
        i++
    ){

        const a=profile[i];
        const b=profile[i+1];

        if(
            x>=a.x &&
            x<=b.x
        ){

            const t=
                (
                    x-a.x
                )/
                (
                    b.x-a.x || 1
                );

            return (
                a.y+
                (
                    b.y-a.y
                )*
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
   DEVICE SETTINGS
========================================================= */

const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(
        navigator.userAgent
    ) ||
    window.innerWidth<=850;


/*
   WebGL mode:
   60k phone / 100k desktop.

   Canvas fallback:
   fewer particles to keep older phones responsive.
*/

const WEBGL_COUNT =
    isMobile
    ? 60000
    : 100000;

const CANVAS_COUNT =
    isMobile
    ? 18000
    : 28000;


/* =========================================================
   COLORS
========================================================= */

const AQUA =
    [0,1,1];

const BLACK =
    [0,0,0];

const YELLOW =
    [1,.70,0];

const WHITE =
    [1,1,1];


/* =========================================================
   ENGINE STATE
========================================================= */

let engineMode =
    "none";


let renderer = null;
let scene = null;
let camera = null;
let controls = null;

let geometry = null;
let material = null;
let points = null;


/* =========================================================
   THREE BUFFERS
========================================================= */

const webglCurrentPositions =
    new Float32Array(
        WEBGL_COUNT*3
    );

const webglTargetPositions =
    new Float32Array(
        WEBGL_COUNT*3
    );

const webglCurrentColors =
    new Float32Array(
        WEBGL_COUNT*3
    );

const webglTargetColors =
    new Float32Array(
        WEBGL_COUNT*3
    );


/* =========================================================
   INITIAL RANDOM WATER/FOAM
========================================================= */

function createRandomCloud(
    positions,
    colors
){

    const count =
        positions.length/3;

    for(
        let i=0;
        i<count;
        i++
    ){

        const n=i*3;

        positions[n]=
            (
                Math.random()-
                .5
            )*
            100;

        positions[n+1]=
            (
                Math.random()-
                .5
            )*
            100;

        positions[n+2]=
            (
                Math.random()-
                .5
            )*
            100;


        colors[n]=AQUA[0];
        colors[n+1]=AQUA[1];
        colors[n+2]=AQUA[2];
    }
}


createRandomCloud(
    webglCurrentPositions,
    webglCurrentColors
);

webglTargetPositions.set(
    webglCurrentPositions
);

webglTargetColors.set(
    webglCurrentColors
);


/* =========================================================
   COMMON RUNTIME STATE
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

let animationStarted =
    performance.now();

const firstViewed =
    {};

const carCache =
    {};


/* =========================================================
   POINTER / AIR BUBBLE
========================================================= */

let bubbleX = 10;
let bubbleY = 10;

let bubbleScreenX = -10000;
let bubbleScreenY = -10000;

let bubbleActive = false;


/* =========================================================
   WEBGL SHADERS
========================================================= */

const vertexShader = `

uniform float uTime;
uniform float uMorph;
uniform float uWaterMotion;

uniform float uPixelRatio;
uniform float uViewportHeight;

uniform vec2 uBubble;

attribute vec3 nextPosition;
attribute vec3 nextColor;

varying vec3 vColor;

void main(){

    vColor=
        mix(
            color,
            nextColor,
            uMorph
        );


    vec3 p=
        mix(
            position,
            nextPosition,
            uMorph
        );


    /*
       WATER MOVEMENT

       This only exists before a car is selected.
    */

    vec3 s=
        position;

    float t=
        uTime;


    vec3 flow=
        vec3(

            sin(
                s.x*.37+
                s.y*.13+
                t*1.08
            )
            +
            .42*sin(
                s.z*.21-
                t*.72
            ),

            sin(
                s.y*.29+
                s.z*.17-
                t*.91
            )
            +
            .37*sin(
                s.x*.19+
                t*.61
            ),

            sin(
                s.z*.31+
                s.x*.11+
                t*.82
            )
            +
            .34*sin(
                s.y*.23-
                t*.49
            )
        );


    p+=
        flow*
        .055*
        uWaterMotion*
        (1.0-uMorph);


    /*
       SMALL AIR BUBBLE

       Local pressure only.
       No large scattering field.
    */

    vec4 clip=
        projectionMatrix*
        modelViewMatrix*
        vec4(
            p,
            1.0
        );


    vec2 screen=
        clip.xy/
        max(
            abs(clip.w),
            .0001
        );


    vec2 d=
        screen-uBubble;


    float distanceToBubble=
        length(d);


    float radius=
        .095;


    float pressure=
        smoothstep(
            radius,
            0.0,
            distanceToBubble
        );


    pressure*=
        .10*
        uWaterMotion*
        (1.0-uMorph);


    if(
        distanceToBubble>.0001 &&
        distanceToBubble<radius
    ){

        p+=
            normalize(d)*
            pressure;
    }


    vec4 mv=
        modelViewMatrix*
        vec4(
            p,
            1.0
        );


    gl_Position=
        projectionMatrix*
        mv;


    float size=
        4.2*
        (
            uViewportHeight/
            1080.0
        )*
        uPixelRatio;


    gl_PointSize=
        clamp(
            size,
            3.0,
            8.0
        );
}
`;


const fragmentShader = `

uniform float uWhite;
uniform float uMorph;

varying vec3 vColor;

void main(){

    float d=
        distance(
            gl_PointCoord,
            vec2(.5,.5)
        );


    if(d>.5)
        discard;


    vec3 colorValue=
        mix(
            vColor,
            vec3(1.0),
            uWhite
        );


    /*
       Initial foam:
       aqua center + black rim.
    */

    if(
        uMorph<.5 &&
        uWhite<.75
    ){

        if(d>.34){

            gl_FragColor=
                vec4(
                    0,
                    0,
                    0,
                    1
                );

        }else{

            float core=
                smoothstep(
                    .34,
                    .025,
                    d
                );

            gl_FragColor=
                vec4(
                    colorValue,
                    max(
                        core,
                        .94
                    )
                );
        }

    }else{

        float alpha=
            smoothstep(
                .50,
                .07,
                d
            );

        gl_FragColor=
            vec4(
                colorValue,
                max(
                    alpha,
                    .97
                )
            );
    }
}
`;


/* =========================================================
   WEBGL SETUP
========================================================= */

function tryWebGL(){

    /*
       IMPORTANT:

       We do NOT manually force a context anymore.

       Three.js gets to negotiate with the browser itself.
       If it fails, Canvas mode takes over.
    */

    try{

        renderer=
            new THREE.WebGLRenderer({

                antialias:false,

                alpha:false,

                powerPreference:
                    "default",

                precision:
                    "mediump"
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


        scene=
            new THREE.Scene();


        camera=
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


        controls=
            new THREE.OrbitControls(
                camera,
                renderer.domElement
            );


        controls.enableDamping=true;

        controls.dampingFactor=.065;

        controls.enablePan=false;

        controls.rotateSpeed=.75;

        controls.zoomSpeed=.8;

        controls.minDistance=7;

        controls.maxDistance=40;

        controls.target.set(
            .2,
            1.25,
            0
        );


        geometry=
            new THREE.BufferGeometry();


        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(
                webglCurrentPositions,
                3
            )
        );


        geometry.setAttribute(
            "nextPosition",
            new THREE.BufferAttribute(
                webglTargetPositions,
                3
            )
        );


        geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(
                webglCurrentColors,
                3
            )
        );


        geometry.setAttribute(
            "nextColor",
            new THREE.BufferAttribute(
                webglTargetColors,
                3
            )
        );


        material=
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
                    }
                },

                vertexColors:true,

                vertexShader,

                fragmentShader,

                transparent:true,

                depthWrite:false,

                depthTest:true
            });


        points=
            new THREE.Points(
                geometry,
                material
            );


        scene.add(
            points
        );


        renderer.domElement
            .addEventListener(
                "pointermove",
                onPointerMove
            );


        renderer.domElement
            .addEventListener(
                "pointerleave",
                clearBubble
            );


        renderer.domElement
            .addEventListener(
                "pointercancel",
                clearBubble
            );


        stage.insertBefore(
            renderer.domElement,
            stage.firstChild
        );


        engineMode=
            "webgl";


        return true;

    }catch(error){

        console.warn(
            "WebGL unavailable. Falling back to Canvas renderer.",
            error
        );


        if(renderer){

            try{
                renderer.dispose();
            }catch(e){}

            if(
                renderer.domElement &&
                renderer.domElement.parentNode
            ){

                renderer.domElement
                    .parentNode
                    .removeChild(
                        renderer.domElement
                    );
            }
        }


        renderer=null;
        scene=null;
        camera=null;
        controls=null;

        return false;
    }
}


/* =========================================================
   POINTER HANDLING
========================================================= */

function onPointerMove(event){

    const rect=
        renderer.domElement
        .getBoundingClientRect();


    bubbleX=
        (
            (
                event.clientX-
                rect.left
            )/
            rect.width
        )*
        2-
        1;


    bubbleY=
        -(
            (
                (
                    event.clientY-
                    rect.top
                )/
                rect.height
            )*
            2-
            1
        );


    material
        .uniforms
        .uBubble
        .value
        .set(
            bubbleX,
            bubbleY
        );
}


function clearBubble(){

    if(material){

        material
            .uniforms
            .uBubble
            .value
            .set(
                10,
                10
            );
    }

    bubbleActive=false;
}


/* =========================================================
   VEHICLE TARGETS
========================================================= */

function buildVehicle(
    model
){

    const definition =
        window.ToyotaCars[
            model
        ];


    if(
        !definition ||
        typeof definition.build!=="function"
    ){

        console.error(
            "Missing fixed vehicle module:",
            model
        );

        return null;
    }


    /*
       Every vehicle file determines its
       particle coordinates deterministically.
    */

    return definition.build(
        WEBGL_COUNT
    );
}


/* =========================================================
   PROGRESS
========================================================= */

function setProgress(
    value
){

    const p=
        Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    value
                )
            )
        );


    progressFill.style.width=
        p+"%";


    progressNumber.textContent=
        p+"%";
}


/* =========================================================
   LOAD FIXED CAR
========================================================= */

function loadVehicle(
    model
){

    const vehicle =
        buildVehicle(
            model
        );


    if(!vehicle)
        return;


    webglTargetPositions.set(
        vehicle.positions
    );


    webglTargetColors.set(
        vehicle.colors
    );


    geometry
        .getAttribute(
            "nextPosition"
        )
        .needsUpdate=true;


    geometry
        .getAttribute(
            "nextColor"
        )
        .needsUpdate=true;


    /*
       Once the user chooses a car:

       water motion immediately becomes ZERO.

       That means the particles stop drifting
       and simply travel from their current random
       location toward the fixed destination.
    */

    material
        .uniforms
        .uWaterMotion
        .value=0;


    material
        .uniforms
        .uMorph
        .value=0;


    material
        .uniforms
        .uWhite
        .value=0;


    /*
       First display of a particular model:
       aqua -> white -> actual car colors.
    */

    if(
        !firstViewed[model]
    ){

        firstViewed[model]=true;

        whiteFormation=true;

        whiteStarted=
            performance.now();

    }else{

        beginMorph();
    }
}


/* =========================================================
   MORPH
========================================================= */

function beginMorph(){

    whiteFormation=false;

    morphing=true;

    morphStarted=
        performance.now();


    material
        .uniforms
        .uWhite
        .value=1;


    material
        .uniforms
        .uMorph
        .value=0;
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
                    b=>
                        b.classList.remove(
                            "active"
                        )
                );


                button.classList.add(
                    "active"
                );


                const model=
                    button.dataset.car;


                selectedCar=
                    model;


                generating=true;


                loading.style.display=
                    "block";


                setProgress(0);


                buttons.forEach(
                    b=>
                        b.disabled=true
                );


                /*
                   First click after module load:
                   target generation is deterministic.
                */

                requestAnimationFrame(
                    ()=>{

                        loadVehicle(
                            model
                        );


                        /*
                           The shape itself is already known.
                           This 100% represents target preparation,
                           not an artificial fake wait.
                        */

                        setProgress(
                            100
                        );


                        generating=false;


                        buttons.forEach(
                            b=>
                                b.disabled=false
                        );
                    }
                );
            }
        );
    }
);


/* =========================================================
   WEBGL ANIMATION
========================================================= */

function animateWebGL(){

    requestAnimationFrame(
        animateWebGL
    );


    const now=
        performance.now();


    material
        .uniforms
        .uTime
        .value=
            (
                now-
                animationStarted
            )/
            1000;


    /*
       WHITE FORMATION
    */

    if(whiteFormation){

        const raw=
            Math.min(
                (
                    now-
                    whiteStarted
                )/
                650,
                1
            );


        const smooth=
            raw*raw*
            (
                3-2*raw
            );


        material
            .uniforms
            .uWhite
            .value=
                smooth;


        if(raw>=1){

            beginMorph();
        }
    }


    /*
       VEHICLE MORPH
    */

    if(morphing){

        const raw=
            Math.min(
                (
                    now-
                    morphStarted
                )/
                2800,
                1
            );


        const eased=
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
            .value=
                eased;


        /*
           White disappears smoothly.
        */

        material
            .uniforms
            .uWhite
            .value=
                Math.max(
                    0,
                    1-
                    raw/.40
                );


        setProgress(
            raw*100
        );


        if(raw>=1){

            morphing=false;


            /*
               FINAL LOCK.

               Copy the fixed target into the
               active particle positions.
            */

            webglCurrentPositions.set(
                webglTargetPositions
            );


            webglCurrentColors.set(
                webglTargetColors
            );


            geometry
                .getAttribute(
                    "position"
                )
                .needsUpdate=true;


            geometry
                .getAttribute(
                    "color"
                )
                .needsUpdate=true;


            material
                .uniforms
                .uMorph
                .value=0;


            material
                .uniforms
                .uWhite
                .value=0;


            /*
               No more movement.
            */

            material
                .uniforms
                .uWaterMotion
                .value=0;


            clearBubble();


            setProgress(100);


            setTimeout(
                ()=>{
                    loading.style.display=
                        "none";
                },
                180
            );
        }
    }


    /*
       ONLY THE NO-SELECTION PAGE MOVES.

       Once a vehicle is selected, automatic rotation
       completely stops. OrbitControls is then the only
       source of motion.
    */

    if(!selectedCar){

        points.rotation.y=
            Math.sin(
                now*.00008
            )*.03;

        points.rotation.x=
            Math.sin(
                now*.00005
            )*.015;

    }else{

        points.rotation.y=0;
        points.rotation.x=0;
    }


    controls.update();

    renderer.render(
        scene,
        camera
    );
}


/* =========================================================
   CANVAS FALLBACK
========================================================= */

let fallbackCanvas=null;
let fallbackCtx=null;

let fallbackPositions=null;
let fallbackColors=null;

let fallbackTargets=null;
let fallbackTargetColors=null;

let fallbackCount=
    CANVAS_COUNT;

let fallbackMorph=0;

let fallbackYaw=0;
let fallbackPitch=.10;

let fallbackZoom=1;

let dragging=false;

let lastPointerX=0;
let lastPointerY=0;


/* =========================================================
   FALLBACK START
========================================================= */

function startCanvasFallback(){

    fallbackCanvas=
        document.createElement(
            "canvas"
        );


    fallbackCanvas.id=
        "particle-fallback-canvas";


    fallbackCanvas.style.position=
        "absolute";

    fallbackCanvas.style.inset=
        "0";

    fallbackCanvas.style.width=
        "100%";

    fallbackCanvas.style.height=
        "100%";

    fallbackCanvas.style.display=
        "block";

    fallbackCanvas.style.touchAction=
        "none";


    fallbackCtx=
        fallbackCanvas.getContext(
            "2d"
        );


    if(!fallbackCtx){

        /*
           Very old environments:
           do not crash the page.
        */

        fallbackCtx=null;

        return;
    }


    stage.insertBefore(
        fallbackCanvas,
        stage.firstChild
    );


    fallbackPositions=
        new Float32Array(
            fallbackCount*3
        );


    fallbackColors=
        new Float32Array(
            fallbackCount*3
        );


    fallbackTargets=
        new Float32Array(
            fallbackCount*3
        );


    fallbackTargetColors=
        new Float32Array(
            fallbackCount*3
        );


    /*
       Random initial foam.
    */

    for(
        let i=0;
        i<fallbackCount;
        i++
    ){

        const n=i*3;

        fallbackPositions[n]=
            (
                Math.random()-
                .5
            )*
            100;

        fallbackPositions[n+1]=
            (
                Math.random()-
                .5
            )*
            100;

        fallbackPositions[n+2]=
            (
                Math.random()-
                .5
            )*
            100;


        fallbackColors[n]=AQUA[0];
        fallbackColors[n+1]=AQUA[1];
        fallbackColors[n+2]=AQUA[2];
    }


    fallbackTargets.set(
        fallbackPositions
    );

    fallbackTargetColors.set(
        fallbackColors
    );


    resizeFallback();


    /*
       Mouse / touch rotation.
    */

    fallbackCanvas.addEventListener(
        "pointerdown",
        event=>{

            dragging=true;

            lastPointerX=
                event.clientX;

            lastPointerY=
                event.clientY;
        }
    );


    window.addEventListener(
        "pointermove",
        event=>{

            if(!dragging)
                return;


            const dx=
                event.clientX-
                lastPointerX;

            const dy=
                event.clientY-
                lastPointerY;


            fallbackYaw+=
                dx*.007;


            fallbackPitch+=
                dy*.005;


            fallbackPitch=
                Math.max(
                    -.9,
                    Math.min(
                        .9,
                        fallbackPitch
                    )
                );


            lastPointerX=
                event.clientX;

            lastPointerY=
                event.clientY;
        }
    );


    window.addEventListener(
        "pointerup",
        ()=>{
            dragging=false;
        }
    );


    fallbackCanvas.addEventListener(
        "wheel",
        event=>{

            event.preventDefault();


            fallbackZoom*=
                event.deltaY>0
                ? .92
                : 1.08;


            fallbackZoom=
                Math.max(
                    .55,
                    Math.min(
                        2,
                        fallbackZoom
                    )
                );
        },
        {
            passive:false
        }
    );


    fallbackCanvas.addEventListener(
        "pointermove",
        event=>{

            const rect=
                fallbackCanvas
                .getBoundingClientRect();


            bubbleScreenX=
                event.clientX-
                rect.left;


            bubbleScreenY=
                event.clientY-
                rect.top;


            bubbleActive=true;
        }
    );


    fallbackCanvas.addEventListener(
        "pointerleave",
        ()=>{
            bubbleActive=false;
        }
    );


    engineMode=
        "canvas";


    requestAnimationFrame(
        animateCanvas
    );
}


/* =========================================================
   FALLBACK RESIZE
========================================================= */

function resizeFallback(){

    if(!fallbackCanvas)
        return;


    const dpr=
        Math.min(
            window.devicePixelRatio||1,
            2
        );


    fallbackCanvas.width=
        Math.max(
            1,
            Math.floor(
                stage.clientWidth*dpr
            )
        );


    fallbackCanvas.height=
        Math.max(
            1,
            Math.floor(
                stage.clientHeight*dpr
            )
        );


    fallbackCtx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );
}


/* =========================================================
   CPU 3D ROTATION
========================================================= */

function rotatePoint(
    x,
    y,
    z
){

    const cy=
        Math.cos(
            fallbackYaw
        );

    const sy=
        Math.sin(
            fallbackYaw
        );


    const cx=
        Math.cos(
            fallbackPitch
        );

    const sx=
        Math.sin(
            fallbackPitch
        );


    const x1=
        x*cy+
        z*sy;


    const z1=
        -x*sy+
        z*cy;


    const y1=
        y*cx-
        z1*sx;


    const z2=
        y*sx+
        z1*cx;


    return {
        x:x1,
        y:y1,
        z:z2
    };
}


/* =========================================================
   CANVAS RENDERING
========================================================= */

function animateCanvas(){

    if(
        engineMode!=="canvas"
    ){
        return;
    }


    requestAnimationFrame(
        animateCanvas
    );


    const now=
        performance.now();


    const width=
        stage.clientWidth;

    const height=
        stage.clientHeight;


    const ctx=
        fallbackCtx;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    const baseScale=
        Math.min(
            width/14,
            height/7
        );


    /*
       Initial cloud motion only.
    */

    const cloudMoving=
        !selectedCar &&
        !generating &&
        !morphing &&
        !whiteFormation;


    const time=
        now*.001;


    const visibleCount=
        fallbackCount;


    for(
        let i=0;
        i<visibleCount;
        i++
    ){

        const n=i*3;


        let x=
            fallbackPositions[n];

        let y=
            fallbackPositions[n+1];

        let z=
            fallbackPositions[n+2];


        /*
           Interpolate fixed target.
        */

        x+=
            (
                fallbackTargets[n]-
                x
            )*
            fallbackMorph;


        y+=
            (
                fallbackTargets[n+1]-
                y
            )*
            fallbackMorph;


        z+=
            (
                fallbackTargets[n+2]-
                z
            )*
            fallbackMorph;


        /*
           Water movement ONLY when no car exists.
        */

        if(cloudMoving){

            x+=
                (
                    Math.sin(
                        x*.37+
                        y*.13+
                        time*1.08
                    )+
                    .42*
                    Math.sin(
                        z*.21-
                        time*.72
                    )
                )*
                .10;


            y+=
                (
                    Math.sin(
                        y*.29+
                        z*.17-
                        time*.91
                    )+
                    .37*
                    Math.sin(
                        x*.19+
                        time*.61
                    )
                )*
                .10;


            z+=
                (
                    Math.sin(
                        z*.31+
                        x*.11+
                        time*.82
                    )+
                    .34*
                    Math.sin(
                        y*.23-
                        time*.49
                    )
                )*
                .10;
        }


        /*
           Tiny local air bubble effect.
        */

        if(
            cloudMoving &&
            bubbleActive
        ){

            const r=
                rotatePoint(
                    x,
                    y,
                    z
                );


            const depth=
                1+
                r.z*.012;


            const sx=
                width/2+
                r.x*
                baseScale*
                depth;


            const sy=
                height*.57-
                r.y*
                baseScale*
                depth;


            const dx=
                sx-
                bubbleScreenX;


            const dy=
                sy-
                bubbleScreenY;


            const d=
                Math.sqrt(
                    dx*dx+
                    dy*dy
                );


            /*
               SMALL bubble radius.
            */

            const radius=
                42;


            if(
                d>1 &&
                d<radius
            ){

                const pressure=
                    (
                        1-
                        d/radius
                    )*
                    .75;


                x+=
                    (
                        dx/d
                    )*
                    pressure;


                y+=
                    (
                        -dy/d
                    )*
                    pressure;
            }
        }


        /*
           Rotate the 3D particle cloud.
        */

        const rotated=
            rotatePoint(
                x,
                y,
                z
            );


        const depth=
            1+
            rotated.z*.012;


        if(depth<.08)
            continue;


        const px=
            width/2+
            rotated.x*
            baseScale*
            depth*
            fallbackZoom;


        const py=
            height*.57-
            rotated.y*
            baseScale*
            depth*
            fallbackZoom;


        const radius=
            Math.max(
                .8,
                Math.min(
                    2.3,
                    1.35*
                    depth
                )
            );


        const r=
            fallbackColors[n];

        const g=
            fallbackColors[n+1];

        const b=
            fallbackColors[n+2];


        /*
           White first-formation stage.
        */

        if(whiteFormation){

            ctx.beginPath();

            ctx.arc(
                px,
                py,
                radius,
                0,
                Math.PI*2
            );

            ctx.fillStyle=
                "#fff";

            ctx.fill();

            continue;
        }


        /*
           Black rim for initial foam.
        */

        if(
            !selectedCar &&
            fallbackMorph<.5
        ){

            ctx.beginPath();

            ctx.arc(
                px,
                py,
                radius*1.7,
                0,
                Math.PI*2
            );

            ctx.fillStyle=
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


        let color=
            "#00ffff";


        if(
            r===0 &&
            g===0 &&
            b===0
        ){

            color=
                "#000";
        }


        if(
            r===1 &&
            g>.5 &&
            b===0
        ){

            color=
                "rgb(255,180,0)";
        }


        ctx.fillStyle=
            color;

        ctx.fill();
    }


    /*
       FALLBACK WHITE STAGE
    */

    if(whiteFormation){

        const raw=
            Math.min(
                (
                    now-
                    whiteStarted
                )/
                650,
                1
            );


        if(raw>=1){

            whiteFormation=false;

            morphing=true;

            morphStarted=
                performance.now();

            fallbackMorph=0;
        }
    }


    /*
       FALLBACK MORPH
    */

    if(morphing){

        const raw=
            Math.min(
                (
                    now-
                    morphStarted
                )/
                2800,
                1
            );


        const eased=
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


        fallbackMorph=
            eased;


        setProgress(
            raw*100
        );


        if(raw>=1){

            morphing=false;


            fallbackPositions.set(
                fallbackTargets
            );


            fallbackColors.set(
                fallbackTargetColors
            );


            fallbackMorph=0;


            setProgress(
                100
            );


            setTimeout(
                ()=>{
                    loading.style.display=
                        "none";
                },
                180
            );
        }
    }
}


/* =========================================================
   FALLBACK VEHICLE BUILDER
========================================================= */

function buildCanvasVehicle(
    model
){

    const definition=
        window.ToyotaCars[
            model
        ];


    if(
        !definition ||
        typeof definition.build!=="function"
    ){

        return null;
    }


    /*
       Build full deterministic shape,
       then downsample it for Canvas.
    */

    const full=
        definition.build(
            WEBGL_COUNT
        );


    const positions=
        new Float32Array(
            CANVAS_COUNT*3
        );

    const colors=
        new Float32Array(
            CANVAS_COUNT*3
        );


    /*
       Deterministic evenly-spaced sample.
    */

    const factor=
        WEBGL_COUNT/
        CANVAS_COUNT;


    for(
        let i=0;
        i<CANVAS_COUNT;
        i++
    ){

        const source=
            Math.min(
                WEBGL_COUNT-1,
                Math.floor(
                    i*factor
                )
            );


        const sn=
            source*3;

        const dn=
            i*3;


        positions[dn]=
            full.positions[sn];

        positions[dn+1]=
            full.positions[sn+1];

        positions[dn+2]=
            full.positions[sn+2];


        colors[dn]=
            full.colors[sn];

        colors[dn+1]=
            full.colors[sn+1];

        colors[dn+2]=
            full.colors[sn+2];
    }


    return {
        positions,
        colors
    };
}


/* =========================================================
   FALLBACK BUTTON PATH
========================================================= */

function applyCanvasVehicle(
    model
){

    const vehicle=
        buildCanvasVehicle(
            model
        );


    if(!vehicle)
        return;


    fallbackTargets.set(
        vehicle.positions
    );


    fallbackTargetColors.set(
        vehicle.colors
    );


    fallbackMorph=0;


    if(
        !firstViewed[model]
    ){

        firstViewed[model]=true;

        whiteFormation=true;

        whiteStarted=
            performance.now();

    }else{

        morphing=true;

        morphStarted=
            performance.now();
    }
}


/* =========================================================
   OVERRIDE BUTTON EVENTS FOR CANVAS
========================================================= */

buttons.forEach(
    button=>{

        button.addEventListener(
            "click",
            ()=>{
                /*
                   The first click handler already exists above.

                   In Canvas mode we intercept the prepared
                   target here without changing the UI flow.
                */

                if(
                    engineMode!=="canvas"
                ){
                    return;
                }


                const model=
                    button.dataset.car;


                if(
                    generating ||
                    morphing ||
                    whiteFormation
                ){
                    return;
                }


                selectedCar=
                    model;


                generating=true;


                loading.style.display=
                    "block";


                setProgress(0);


                buttons.forEach(
                    b=>
                        b.disabled=true
                );


                requestAnimationFrame(
                    ()=>{

                        applyCanvasVehicle(
                            model
                        );


                        setProgress(100);


                        generating=false;


                        buttons.forEach(
                            b=>
                                b.disabled=false
                        );
                    }
                );
            }
        );
    }
);


/* =========================================================
   RESIZE
========================================================= */

window.addEventListener(
    "resize",
    ()=>{

        if(
            engineMode==="webgl"
        ){

            const w=
                stage.clientWidth;

            const h=
                Math.max(
                    1,
                    stage.clientHeight
                );


            camera.aspect=
                w/h;


            camera.updateProjectionMatrix();


            renderer.setPixelRatio(
                Math.min(
                    window.devicePixelRatio||1,
                    isMobile?1.5:2
                )
            );


            renderer.setSize(
                w,
                h,
                false
            );


            material
                .uniforms
                .uPixelRatio
                .value=
                    Math.min(
                        window.devicePixelRatio||1,
                        isMobile?1.5:2
                    );


            material
                .uniforms
                .uViewportHeight
                .value=
                    h;

        }else if(
            engineMode==="canvas"
        ){

            resizeCanvas();
        }
    }
);


function resizeCanvas(){

    if(
        !fallbackCanvas ||
        !fallbackCtx
    ){
        return;
    }


    const dpr=
        Math.min(
            window.devicePixelRatio||1,
            2
        );


    fallbackCanvas.width=
        Math.max(
            1,
            Math.floor(
                stage.clientWidth*dpr
            )
        );


    fallbackCanvas.height=
        Math.max(
            1,
            Math.floor(
                stage.clientHeight*dpr
            )
        );


    fallbackCtx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );
}


/* =========================================================
   UNIFIED STARTUP
========================================================= */

if(
    tryWebGL()
){

    engineMode=
        "webgl";

    animateWebGL();

}else{

    /*
       THIS IS THE IMPORTANT FIX.

       The site does NOT show:

       "This browser could not create a WebGL graphics context."

       It simply changes renderer.
    */

    engineMode=
        "canvas";

    startCanvasFallback();
}