"use strict";

window.ToyotaCars =
    window.ToyotaCars || {};


window.ToyotaCars["innova-crysta"] = {

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


        const R=.76;

        const front=2.55;
        const rear=-2.56;


        /*
           LONG MPV PROFILE
        */

        const profile=[

            {x:-4.53,y:.61},

            {x:-4.35,y:1.01},

            {x:-3.85,y:1.35},

            {x:-2.00,y:1.60},

            {x:-1.70,y:3.08},

            {x:1.28,y:3.18},

            {x:1.48,y:1.55},

            {x:2.90,y:1.54},

            {x:4.05,y:1.38},

            {x:4.53,y:.79}
        ];


        for(let i=0;i<count;i++){

            const s=
                T.sequence(
                    i,
                    41
                );


            const region=s.z;

            let p;
            let c;


            /*
               LONG BODY
            */

            if(region<.50){

                const x=
                    -4.50+
                    s.x*9.00;

                const top=
                    T.profileY(
                        x,
                        profile
                    );

                p={

                    x,

                    y:
                        .58+
                        s.y*
                        Math.max(
                            .22,
                            top-.58
                        ),

                    z:
                        s.y<.5
                        ? -1.45
                        : 1.45
                };

                c=E.AQUA;
            }


            /*
               BIG MPV GLASS AREA
            */

            else if(region<.70){

                const x=
                    -.92+
                    s.x*3.08;

                p={

                    x,

                    y:
                        1.94+
                        s.y*
                        1.00,

                    z:
                        s.y<.5
                        ? -1.60
                        : 1.60
                };

                c=E.BLACK;
            }


            /*
               WHEELS
            */

            else if(region<.81){

                const x=
                    s.x<.5
                    ? front
                    : rear;

                p=
                    T.wheel(
                        s,
                        x,
                        R,
                        s.y<.5
                        ? -1.58
                        : 1.58
                    );

                c=E.BLACK;
            }


            /*
               FRONT GRILLE
            */

            else if(region<.88){

                p={

                    x:
                        4.58,

                    y:
                        .78+
                        s.x*.67,

                    z:
                        -1.08+
                        s.y*2.16
                };

                c=E.BLACK;
            }


            /*
               HEADLIGHTS
            */

            else if(region<.93){

                p={

                    x:
                        4.62,

                    y:
                        1.27+
                        s.x*.26,

                    z:
                        s.y<.5
                        ? -.99
                        : .99
                };

                c=E.BLACK;
            }


            /*
               YELLOW INDICATORS
            */

            else if(region<.95){

                p={

                    x:
                        4.65,

                    y:
                        1.06+
                        s.x*.20,

                    z:
                        s.y<.5
                        ? -.90
                        : .90
                };

                c=E.YELLOW;
            }


            /*
               SIDE / LOWER TRIM
            */

            else{

                p={

                    x:
                        -2.60+
                        s.x*5.10,

                    y:
                        .67+
                        s.y*.17,

                    z:
                        s.y<.5
                        ? -1.61
                        : 1.61
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