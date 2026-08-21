"use strict";

window.ToyotaCars =
    window.ToyotaCars || {};


window.ToyotaCars["legender"] = {

    build(count){

        const T =
            window.ToyotaShapeTools;

        const E =
            window.ToyotaEngine;

        const positions =
            new Float32Array(
                count*3
            );

        const colors =
            new Float32Array(
                count*3
            );


        const R=.81;

        const front=2.74;
        const rear=-2.72;


        /*
           FIXED LEGENDER PROFILE
        */

        const profile=[

            {x:-4.68,y:.61},

            {x:-4.45,y:1.04},

            {x:-4.02,y:1.37},

            {x:-2.02,y:1.66},

            {x:-1.64,y:3.30},

            {x:.92,y:3.38},

            {x:1.15,y:1.63},

            {x:2.80,y:1.61},

            {x:4.12,y:1.42},

            {x:4.68,y:.79}
        ];


        for(let i=0;i<count;i++){

            const s=
                T.sequence(
                    i,
                    19
                );


            let p;
            let c;


            const region=s.z;


            /*
               BODY
            */

            if(region<.53){

                const x=
                    -4.65+
                    s.x*9.30;

                const top=
                    T.profileY(
                        x,
                        profile
                    );

                p={
                    x,

                    y:
                        .57+
                        s.y*
                        Math.max(
                            .22,
                            top-.57
                        ),

                    z:
                        s.y<.5
                        ? -1.48
                        : 1.48
                };

                c=E.AQUA;
            }


            /*
               WINDOWS
            */

            else if(region<.68){

                const x=
                    -.82+
                    s.x*2.48;

                p={
                    x,

                    y:
                        1.98+
                        s.y*
                        1.08,

                    z:
                        s.y<.5
                        ? -1.63
                        : 1.63
                };

                c=E.BLACK;
            }


            /*
               WHEELS
            */

            else if(region<.80){

                const which=
                    s.x<.5
                    ? front
                    : rear;

                p=
                    T.wheel(
                        s,
                        which,
                        R,
                        s.y<.5
                        ? -1.65
                        : 1.65
                    );

                c=E.BLACK;
            }


            /*
               LARGE ANGULAR GRILLE
            */

            else if(region<.89){

                const side=
                    s.y<.5
                    ? -1
                    : 1;

                p={

                    x:
                        4.72,

                    y:
                        .82+
                        s.x*.70,

                    z:
                        side*
                        (
                            .48+
                            s.y*.92
                        )
                };

                c=E.BLACK;
            }


            /*
               SHARP HEADLIGHT
            */

            else if(region<.935){

                const side=
                    s.y<.5
                    ? -1
                    : 1;

                p={

                    x:4.76,

                    y:
                        1.30+
                        s.x*.28,

                    z:
                        side*
                        (
                            1.08+
                            s.x*.20
                        )
                };

                c=E.BLACK;
            }


            /*
               YELLOW INDICATOR
            */

            else if(region<.955){

                p={

                    x:4.80,

                    y:
                        1.08+
                        s.x*.20,

                    z:
                        s.y<.5
                        ? -.98
                        : .98
                };

                c=E.YELLOW;
            }


            /*
               SPORTY BLACK SIDE TRIM
            */

            else{

                p={

                    x:
                        -2.55+
                        s.x*5.10,

                    y:
                        .67+
                        s.y*.18,

                    z:
                        s.y<.5
                        ? -1.68
                        : 1.68
                };

                c=E.BLACK;
            }


            T.put(
                positions,
                i,
                p
            );

            T.color(
                colors,
                i,
                c
            );
        }


        return {
            positions,
            colors
        };
    }
};