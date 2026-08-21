"use strict";


/* =========================================================
   GLOBAL REGISTRY
========================================================= */

window.ToyotaCars =
    window.ToyotaCars || {};

window.ToyotaShapeTools =
    window.ToyotaShapeTools || {};


/* =========================================================
   SHAPE TOOLS
========================================================= */

const Tools = window.ToyotaShapeTools;


/*
   Deterministic low-discrepancy sequence.

   No random target positions are used here.
   Given the same shape parameters and particle index,
   the same point is always produced.
*/

Tools.sequence = function(index, salt = 1) {

    const a = 0.6180339887498949;

    const b = 0.7548776662466927;

    return {
        x: (index * a + salt * .173) % 1,
        y: (index * b + salt * .271) % 1,
        z: (index * (a + b) + salt * .119) % 1
    };
};


/*
   Interpolate between two points.
*/

Tools.lerp = function(a,b,t){

    return {
        x: a.x + (b.x-a.x)*t,
        y: a.y + (b.y-a.y)*t,
        z: a.z + (b.z-a.z)*t
    };
};


/*
   Put a point inside an output array.
*/

Tools.put = function(array,index,p){

    const n=index*3;

    array[n]=p.x;
    array[n+1]=p.y;
    array[n+2]=p.z;
};


/*
   Put color.
*/

Tools.color = function(array,index,c){

    const n=index*3;

    array[n]=c[0];
    array[n+1]=c[1];
    array[n+2]=c[2];
};


/*
   Surface rectangle sampler.
*/

Tools.surface = function(
    seq,
    x0,
    x1,
    y0,
    y1,
    z,
){

    return {
        x: x0 + (x1-x0)*seq.x,
        y: y0 + (y1-y0)*seq.y,
        z
    };
};


/*
   Circular wheel point.
*/

Tools.wheel = function(
    seq,
    cx,
    radius,
    z
){

    const angle =
        seq.x * Math.PI * 2;

    const rr =
        Math.sqrt(seq.y) *
        radius;

    return {
        x:
            cx +
            Math.cos(angle)*rr,

        y:
            radius +
            Math.sin(angle)*rr,

        z
    };
};


/*
   Generic body profile sampler.

   Each individual car can provide:
   - side profile
   - roof profile
   - wheel locations
*/

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
                (x-a.x)/
                (b.x-a.x || 1);

            return a.y+
                   (b.y-a.y)*t;
        }
    }

    return profile[
        profile.length-1
    ].y;
};


/* =========================================================
   ENGINE
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


const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(
        navigator.userAgent
    ) ||
    window.innerWidth <= 850;


const PARTICLES =
    isMobile
    ? 60000
    : 100000;


/* =========================================================
   COLORS
========================================================= */

const AQUA =
    [0,1,1];

const WHITE =
    [1,1,1];

const BLACK =
    [0,0,0];

const YELLOW =
    [1,.70,0];


/* =========================================================
   THREE.JS
========================================================= */

let renderer = null;
let scene = null;
let camera = null;
let controls = null;

let geometry = null;
let material = null;
let particleSystem = null;


/* =========================================================
   PARTICLE ARRAYS
========================================================= */

const currentPositions =
    new Float32Array(
        PARTICLES*3
    );

const targetPositions =
    new Float32Array(
        PARTICLES*3
    );

const currentColors =
    new Float32Array(
        PARTICLES*3
    );

const targetColors =
    new Float32Array(
        PARTICLES*3
    );


/* =========================================================
   INITIAL CLOUD
========================================================= */

function randomCloud(){

    for(
        let i=0;
        i<PARTICLES;
        i++
    ){

        const n=i*3;

        /*
           The initial cloud is intentionally random.
           This is the ONLY random state.
        */

        currentPositions[n]=
            (Math.random()-.5)*100;

        currentPositions[n+1]=
            (Math.random()-.5)*100;

        currentPositions[n+2]=
            (Math.random()-.5)*100;


        currentColors[n]=AQUA[0];
        currentColors[n+1]=AQUA[1];
        currentColors[n+2]=AQUA[2];
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
uniform float uWhite;
uniform float uWaterMotion;

uniform float uPixelRatio;
uniform float uViewportHeight;

uniform vec2 uBubble;

attribute vec3 nextPosition;
attribute vec3 nextColor;

varying vec3 vColor;

void main(){

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
       WATER / FOAM MOTION

       The movement exists only before selection.
    */

    float t=uTime;

    vec3 s=position;


    vec3 flow=vec3(

        sin(
            s.x*.37+
            s.y*.13+
            t*1.08
        )+
        .42*sin(
            s.z*.21-
            t*.72
        ),

        sin(
            s.y*.29+
            s.z*.17-
            t*.91
        )+
        .37*sin(
            s.x*.19+
            t*.61
        ),

        sin(
            s.z*.31+
            s.x*.11+
            t*.82
        )+
        .34*sin(
            s.y*.23-
            t*.49
        )
    );


    p +=
        flow *
        .055 *
        uWaterMotion *
        (1.0-uMorph);


    /*
       SMALL AIR BUBBLE

       Water + foam concept:
       only particles close to the mouse
       are gently displaced.
    */

    vec4 clip =
        projectionMatrix *
        modelViewMatrix *
        vec4(
            p,
            1.0
        );


    vec2 screen =
        clip.xy /
        max(
            abs(clip.w),
            .0001
        );


    vec2 delta =
        screen-uBubble;


    float d =
        length(delta);


    float radius =
        .095;


    float pressure =
        smoothstep(
            radius,
            0.0,
            d
        );


    pressure *=
        .10 *
        uWaterMotion *
        (1.0-uMorph);


    if(
        d>.0001 &&
        d<radius
    ){

        p +=
            normalize(delta) *
            pressure;
    }


    vec4 mv =
        modelViewMatrix *
        vec4(
            p,
            1.0
        );


    gl_Position =
        projectionMatrix *
        mv;


    float px =
        4.2 *
        (
            uViewportHeight/
            1080.0
        ) *
        uPixelRatio;


    gl_PointSize =
        clamp(
            px,
            3.0,
            8.0
        );
}
`;


/*
   IMPORTANT:
   `color` is provided by Three.js as the Points
   color attribute.
*/

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


    if(d>.5)
        discard;


    vec3 c =
        mix(
            vColor,
            vec3(
                1.0
            ),
            uWhite
        );


    /*
       Black rim for the initial foam.
    */

    if(
        uMorph<.5 &&
        uWhite<.75
    ){

        if(d>.34){

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
                    c,
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
                c,
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

function initWebGL(){

    try{

        const canvas =
            document.createElement(
                "canvas"
            );

        let gl=null;


        /*
           WebGL 1 first.
        */

        try{

            gl=
                canvas.getContext(
                    "webgl",
                    {
                        antialias:false,
                        alpha:false,
                        depth:true,
                        stencil:false,
                        powerPreference:"default"
                    }
                );

        }catch(e){}


        /*
           Experimental fallback.
        */

        if(!gl){

            try{

                gl=
                    canvas.getContext(
                        "experimental-webgl"
                    );

            }catch(e){}
        }


        /*
           WebGL 2.
        */

        if(!gl){

            try{

                gl=
                    canvas.getContext(
                        "webgl2"
                    );

            }catch(e){}
        }


        if(!gl)
            return false;


        renderer =
            new THREE.WebGLRenderer({
                canvas,
                context:gl,
                antialias:false,
                alpha:false,
                precision:"mediump",
                powerPreference:"default"
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


        geometry =
            new THREE.BufferGeometry();


        randomCloud();


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
                    }
                },

                vertexColors:true,

                vertexShader,

                fragmentShader,

                transparent:true,

                depthWrite:false,

                depthTest:true
            });


        particleSystem =
            new THREE.Points(
                geometry,
                material
            );


        scene.add(
            particleSystem
        );


        renderer.domElement.addEventListener(
            "pointermove",
            e=>{

                const r =
                    renderer
                    .domElement
                    .getBoundingClientRect();


                material
                    .uniforms
                    .uBubble
                    .value
                    .set(
                        (
                            (e.clientX-r.left)/
                            r.width
                        )*2-1,

                        -(
                            (
                                (e.clientY-r.top)/
                                r.height
                            )*2-1
                        )
                    );
            }
        );


        renderer.domElement.addEventListener(
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


        return true;

    }catch(error){

        console.warn(
            "WebGL unavailable:",
            error
        );

        renderer=null;

        return false;
    }
}


/* =========================================================
   FIXED CAR TARGET BUILDER
========================================================= */

function getVehicleTargets(
    model
){

    const car =
        window.ToyotaCars[model];

    if(
        !car ||
        typeof car.build !== "function"
    ){

        console.error(
            "Vehicle definition missing:",
            model
        );

        return null;
    }


    return car.build(
        PARTICLES
    );
}


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
        p+"%";

    progressNumber.textContent =
        p+"%";
}


/* =========================================================
   APPLY VEHICLE TARGET
========================================================= */

function applyVehicle(
    model
){

    const vehicle =
        getVehicleTargets(
            model
        );


    if(!vehicle)
        return;


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
        .needsUpdate=true;


    geometry
        .getAttribute(
            "nextColor"
        )
        .needsUpdate=true;


    /*
       Freeze the random water once selection happens.
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


    if(
        !firstSeen[model]
    ){

        firstSeen[model]=true;

        whiteStage=true;

        whiteStart =
            performance.now();

    }else{

        beginMorph();
    }
}


/* =========================================================
   MORPH
========================================================= */

let morphing=false;
let whiteStage=false;

let whiteStart=0;
let morphStart=0;


function beginMorph(){

    whiteStage=false;

    morphing=true;

    morphStart=
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
   BUTTON EVENTS
========================================================= */

buttons.forEach(
    button=>{

        button.addEventListener(
            "click",
            ()=>{

                if(
                    generating ||
                    morphing ||
                    whiteStage
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


                const model =
                    button.dataset.car;


                generating=true;


                loading.style.display =
                    "block";


                setProgress(0);


                buttons.forEach(
                    b=>
                        b.disabled=true
                );


                /*
                   The target shape is NOT generated randomly.

                   It is already deterministically defined by
                   that vehicle's module.
                */

                requestAnimationFrame(
                    ()=>{

                        applyVehicle(
                            model
                        );


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
                appStart
            )/
            1000;


    /*
       White transition.
    */

    if(whiteStage){

        const raw =
            Math.min(
                (
                    now-
                    whiteStart
                )/
                WHITE_DURATION,
                1
            );


        const smooth =
            raw*raw*
            (3-2*raw);


        material
            .uniforms
            .uWhite
            .value =
                smooth;


        if(raw>=1){

            beginMorph();
        }
    }


    /*
       Actual vehicle morph.
    */

    if(morphing){

        const raw =
            Math.min(
                (
                    now-
                    morphStart
                )/
                2800,
                1
            );


        const eased =
            raw<.5

            ? 4*
              raw*
              raw*
              raw

            : 1-
              Math.pow(
                  -2*raw+2,
                  3
              )/2;


        material
            .uniforms
            .uMorph
            .value =
                eased;


        /*
           White slowly turns into
           aqua / black / yellow.
        */

        material
            .uniforms
            .uWhite
            .value =
                Math.max(
                    0,
                    1-
                    raw/.4
                );


        setProgress(
            raw*100
        );


        if(raw>=1){

            morphing=false;


            /*
               FIXED FINAL STATE
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
               Absolutely no more random motion.
            */

            material
                .uniforms
                .uWaterMotion
                .value=0;


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
                    loading.style.display="none";
                },
                200
            );
        }
    }


    /*
       Only the initial cloud is alive.

       Once a vehicle is selected, the particle
       positions are completely static.
    */

    if(
        !currentModel &&
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

        particleSystem.rotation.y=0;
        particleSystem.rotation.x=0;
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

        if(!renderer)
            return;


        const w =
            stage.clientWidth;

        const h =
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
            .value=h;
    }
);


/* =========================================================
   START
========================================================= */

if(
    initWebGL()
){

    animate();

}else{

    /*
       The project deliberately stops here rather than
       silently showing a broken non-3D implementation.
    */

    const message =
        document.createElement(
            "div"
        );

    message.style.cssText = `
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
        "This browser could not create a WebGL graphics context.";

    stage.appendChild(
        message
    );
}


/*
   Expose common values for vehicle files.
*/

window.ToyotaEngine = {

    PARTICLES,

    AQUA,
    BLACK,
    YELLOW,

    Tools
};