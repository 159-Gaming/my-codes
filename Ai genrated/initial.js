"use strict";


/* =========================================================
   GLOBALS
========================================================= */

window.ToyotaCars =
    window.ToyotaCars || {};

window.ToyotaShapeTools =
    window.ToyotaShapeTools || {};


const Tools =
    window.ToyotaShapeTools;


/* =========================================================
   DETERMINISTIC TOOLS
========================================================= */

Tools.sequence =
function(index, salt = 1){

    const a =
        0.6180339887498949;

    const b =
        0.7548776662466927;

    return {

        x:
            (
                index*a+
                salt*.173
            )%1,

        y:
            (
                index*b+
                salt*.271
            )%1,

        z:
            (
                index*(a+b)+
                salt*.119
            )%1
    };
};


Tools.put =
function(array,index,point){

    const n=
        index*3;

    array[n]=point.x;

    array[n+1]=point.y;

    array[n+2]=point.z;
};


Tools.color =
function(array,index,color){

    const n=
        index*3;

    array[n]=color[0];

    array[n+1]=color[1];

    array[n+2]=color[2];
};


Tools.wheel =
function(
    sequence,
    centerX,
    radius,
    z
){

    const angle=
        sequence.x*
        Math.PI*
        2;

    const radial=
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

        const a=
            profile[i];

        const b=
            profile[i+1];


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
   DEVICE
========================================================= */

const mobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(
        navigator.userAgent
    ) ||
    window.innerWidth<=850;


const WEBGL_COUNT =
    mobile
    ? 60000
    : 100000;


/*
   Smaller fallback count for devices
   without WebGL.
*/

const CANVAS_COUNT =
    mobile
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


/* =========================================================
   ENGINE
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
   WEBGL ARRAYS
========================================================= */

const currentPositions =
    new Float32Array(
        WEBGL_COUNT*3
    );

const targetPositions =
    new Float32Array(
        WEBGL_COUNT*3
    );

const currentColors =
    new Float32Array(
        WEBGL_COUNT*3
    );

const targetColors =
    new Float32Array(
        WEBGL_COUNT*3
    );


/* =========================================================
   RANDOM INITIAL CLOUD
========================================================= */

function createInitialCloud(){

    for(
        let i=0;
        i<WEBGL_COUNT;
        i++
    ){

        const n=
            i*3;


        currentPositions[n]=
            (
                Math.random()-.5
            )*100;


        currentPositions[n+1]=
            (
                Math.random()-.5
            )*100;


        currentPositions[n+2]=
            (
                Math.random()-.5
            )*100;


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


createInitialCloud();


/* =========================================================
   STATE
========================================================= */

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

const viewed =
    {};


let appStart =
    performance.now();


/* =========================================================
   PROGRESS
========================================================= */

function updateProgress(
    value
){

    const p=
        Math.max(
            0,
            Math.min(
                100,
                Math.floor(
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
   WEBGL SHADER
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
       WATER / FOAM
    */

    vec3 s=
        position;

    float t=
        uTime;


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


    p+=
        flow*
        .055*
        uWaterMotion*
        (1.0-uMorph);


    /*
       SMALL AIR BUBBLE
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


    vec2 delta=
        screen-uBubble;


    float distanceToBubble=
        length(delta);


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
            normalize(delta)*
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


    vec3 particleColor=
        mix(
            vColor,
            vec3(
                1.0
            ),
            uWhite
        );


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
                    particleColor,
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
                particleColor,
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

        /*
           Let Three.js negotiate normally.

           We no longer create a manually injected
           WebGL context.
        */

        renderer=
            new THREE.WebGLRenderer({
                antialias:false,
                alpha:false,
                precision:"mediump",
                powerPreference:"default"
            });


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio||1,
                mobile?1.5:2
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


        controls.enableDamping=
            true;

        controls.dampingFactor=
            .065;

        controls.enablePan=
            false;

        controls.minDistance=
            7;

        controls.maxDistance=
            40;

        controls.rotateSpeed=
            .75;

        controls.zoomSpeed=
            .8;

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
                                mobile?1.5:2
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

                vertexColors:
                    true,

                vertexShader,

                fragmentShader,

                transparent:
                    true,

                depthWrite:
                    false,

                depthTest:
                    true
            });


        particleSystem=
            new THREE.Points(
                geometry,
                material
            );


        scene.add(
            particleSystem
        );


        /*
           Mouse bubble.
        */

        renderer.domElement.addEventListener(
            "pointermove",
            event=>{

                const r=
                    renderer
                    .domElement
                    .getBoundingClientRect();


                material
                    .uniforms
                    .uBubble
                    .value
                    .set(

                        (
                            (event.clientX-r.left)/
                            r.width
                        )*2-1,

                        -(
                            (
                                (event.clientY-r.top)/
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


        mode=
            "webgl";


        return true;

    }catch(error){

        console.warn(
            "WebGL unavailable:",
            error
        );


        renderer=null;
        scene=null;
        camera=null;
        controls=null;


        return false;
    }
}


/* =========================================================
   FIXED VEHICLE GENERATION IN CHUNKS
========================================================= */

function prepareVehicle(
    model,
    onComplete
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
            "Vehicle module not loaded:",
            model
        );


        loading.style.display=
            "none";


        generating=false;


        buttons.forEach(
            b=>
                b.disabled=false
        );


        return;
    }


    /*
       Generate deterministic fixed targets
       without blocking the browser.

       The car modules return the final arrays.
       We yield before and after the operation so
       the browser can repaint.
    */

    updateProgress(2);


    requestAnimationFrame(
        ()=>{

            let vehicle;


            try{

                vehicle=
                    definition.build(
                        WEBGL_COUNT
                    );

            }catch(error){

                console.error(
                    "Vehicle generation error:",
                    error
                );


                loading.style.display=
                    "none";


                generating=false;


                buttons.forEach(
                    b=>
                        b.disabled=false
                );


                return;
            }


            updateProgress(55);


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
                        .needsUpdate=true;


                    geometry
                        .getAttribute(
                            "nextColor"
                        )
                        .needsUpdate=true;


                    updateProgress(100);


                    requestAnimationFrame(
                        ()=>{

                            onComplete();
                        }
                    );
                }
            );
        }
    );
}


/* =========================================================
   START CAR
========================================================= */

function startCar(
    model
){

    selectedCar=
        model;


    /*
       Stop water movement immediately.
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
        !viewed[model]
    ){

        viewed[model]=true;

        whiteFormation=true;

        morphing=false;

        whiteStart=
            performance.now();

    }else{

        beginMorph();
    }
}


/* =========================================================
   BEGIN MORPH
========================================================= */

function beginMorph(){

    whiteFormation=
        false;

    morphing=
        true;

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
                    whiteFormation ||
                    morphing
                ){
                    return;
                }


                /*
                   Disable every button
                   during preparation.
                */

                buttons.forEach(
                    b=>{

                        b.disabled=
                            true;

                        b.classList.remove(
                            "active"
                        );
                    }
                );


                button.classList.add(
                    "active"
                );


                const model=
                    button.dataset.car;


                generating=
                    true;


                selectedCar=
                    null;


                loading.style.display=
                    "block";


                updateProgress(
                    0
                );


                /*
                   IMPORTANT:
                   This is the ONLY click handler.

                   No duplicate Canvas handler.
                */

                prepareVehicle(
                    model,
                    ()=>{

                        generating=
                            false;


                        buttons.forEach(
                            b=>
                                b.disabled=false
                        );


                        startCar(
                            model
                        );
                    }
                );
            }
        );
    }
);


/* =========================================================
   MAIN ANIMATION
========================================================= */

function animate(){

    requestAnimationFrame(
        animate
    );


    const now=
        performance.now();


    material
        .uniforms
        .uTime
        .value=
            (
                now-
                appStart
            )/
            1000;


    /*
       White transition.
    */

    if(
        whiteFormation
    ){

        const raw=
            Math.min(
                (
                    now-
                    whiteStart
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


        if(
            raw>=1
        ){

            beginMorph();
        }
    }


    /*
       Vehicle morph.
    */

    if(
        morphing
    ){

        const raw=
            Math.min(
                (
                    now-
                    morphStart
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
           White gradually becomes
           aqua/black/yellow.
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


        updateProgress(
            raw*100
        );


        if(
            raw>=1
        ){

            morphing=
                false;


            /*
               LOCK FINAL POSITION.

               No drifting.
               No random movement.
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


            updateProgress(
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


    /*
       NO MODEL:
       particles behave like underwater foam.

       MODEL:
       particles are completely stationary.
    */

    if(
        !selectedCar &&
        !generating
    ){

        particleSystem.rotation.y=
            Math.sin(
                now*.00008
            )*.03;


        particleSystem.rotation.x=
            Math.sin(
                now*.00005
            )*.015;

    }else{

        particleSystem.rotation.y=
            0;

        particleSystem.rotation.x=
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
            mode!=="webgl"
        ){
            return;
        }


        const width=
            stage.clientWidth;

        const height=
            Math.max(
                1,
                stage.clientHeight
            );


        camera.aspect=
            width/height;


        camera.updateProjectionMatrix();


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio||1,
                mobile?1.5:2
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
            .value=
                Math.min(
                    window.devicePixelRatio||1,
                    mobile?1.5:2
                );


        material
            .uniforms
            .uViewportHeight
            .value=
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
       No fake WebGL error page.
       Show a clean compatibility message.
    */

    const message =
        document.createElement(
            "div"
        );


    message.style.cssText=
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


    message.textContent=
        "WebGL is unavailable on this browser. Please enable hardware graphics acceleration or use a modern browser.";


    stage.appendChild(
        message
    );
}