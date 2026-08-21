"use strict";

window.ToyotaCars =
    window.ToyotaCars || {};


window.ToyotaCars["innova-hycross"] = {

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


        const R=.77;

        const front=2.58;
        const rear=-2.59;


        /*
           SLEEKER MPV/CROSSOVER PROFILE
        */

        const profile=[

            {x:-4.58,y:.61},

            {x:-4.36,y:1.00},

            {x:-3.90,y:1.30},

            {x:-1.95,y:1.57},

            {x:-1.62,y:2.98},

            {x:1.20,y:3.08},

            {x:1.48,y:1.52},

            {x:2.85,y:1.51},

            {x:4.08,y:1.37},

            {x:4.58,y:.80}
        ];


        for(let i=0;i<count;i++){

            const s=
                T.sequence(
                    i,
                    53
                );


            const region=s.z;

            let p;
            let c;


            /*
               BODY
            */

            if(region<.50){

                const x=
                    -4.55+
                    s.x*9.10;

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
                        ? -1.44
                        : 1.44
                };

                c=E.AQUA;
            }


            /*
               SLEEKER GLASS
            */

            else if(region<.69){

                const x=
                    -.78+
                    s.x*2.92;

                p={

                    x,

                    y:
                        1.93+
                        s.y*
                        .92,

                    z:
                        s.y<.5
                        ? -1.59
                        : 1.59
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
                        ? -1.59
                        : 1.59
                    );

                c=E.BLACK;
            }


            /*
               MODERN FRONT GRILLE
            */

            else if(region<.88){

                p={

                    x:
                        4.64,

                    y:
                        .78+
                        s.x*.68,

                    z:
                        -1.05+
                        s.y*2.10
                };

                c=E.BLACK;
            }


            /*
               MODERN HEADLIGHT
            */

            else if(region<.925){

                p={

                    x:
                        4.67,

                    y:
                        1.27+
                        s.x*.27,

                    z:
                        s.y<.5
                        ? -.98
                        : .98
                };

                c=E.BLACK;
            }


            /*
               YELLOW INDICATOR
            */

            else if(region<.95){

                p={

                    x:
                        4.70,

                    y:
                        1.07+
                        s.x*.22,

                    z:
                        s.y<.5
                        ? -.90
                        : .90
                };

                c=E.YELLOW;
            }


            /*
               LOWER BLACK TRIM
            */

            else{

                p={

                    x:
                        -2.60+
                        s.x*5.05,

                    y:
                        .66+
                        s.y*.17,

                    z:
                        s.y<.5
                        ? -1.60
                        : 1.60
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