"use strict";

window.ToyotaCars =
    window.ToyotaCars || {};


window.ToyotaCars["fortuner"] = {

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


        const L=9.30;
        const W=3.24;
        const R=.82;

        const front=2.72;
        const rear=-2.72;


        /*
           FIXED SIDE PROFILE

           This is the target shape.
           It is NOT regenerated randomly.
        */

        const profile=[

            {x:-4.65,y:.62},

            {x:-4.45,y:1.05},

            {x:-4.00,y:1.40},

            {x:-2.10,y:1.70},

            {x:-1.70,y:3.40},

            {x:.90,y:3.48},

            {x:1.15,y:1.68},

            {x:2.85,y:1.66},

            {x:4.15,y:1.48},

            {x:4.65,y:.85}
        ];


        for(let i=0;i<count;i++){

            const s =
                T.sequence(
                    i,
                    11
                );


            /*
               PART DISTRIBUTION
            */

            const region =
                s.z;


            let p;
            let c;


            /* BODY */
            if(region<.56){

                const x=
                    -4.60+
                    s.x*9.20;

                const top=
                    T.profileY(
                        x,
                        profile
                    );


                const side=
                    s.y<.55
                    ? -1
                    : 1;


                p={
                    x,
                    y:.58+
                      s.y*
                      Math.max(
                          .20,
                          top-.58
                      ),
                    z:
                        side*
                        (
                            1.40+
                            s.x*.10
                        )
                };

                c=E.AQUA;
            }


            /* WINDOWS */
            else if(region<.72){

                const x=
                    -.95+
                    s.x*2.35;

                const top=
                    2.45+
                    .20*
                    (
                        1-
                        Math.abs(
                            x/
                            1.4
                        )
                    );


                p={
                    x,
                    y:
                        2.00+
                        s.y*
                        (
                            top-2.00
                        ),
                    z:
                        s.y<.5
                        ? -1.64
                        : 1.64
                };

                c=E.BLACK;
            }


            /* WHEELS */
            else if(region<.83){

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
                        ? -1.66
                        : 1.66
                    );

                c=E.BLACK;
            }


            /* GRILLE */
            else if(region<.89){

                p={
                    x:4.68,
                    y:.82+
                      s.x*.80,
                    z:
                        -1.05+
                        s.y*2.10
                };

                c=E.BLACK;
            }


            /* HEADLIGHT */
            else if(region<.935){

                p={
                    x:4.70,
                    y:1.26+
                      s.x*.30,
                    z:
                        s.y<.5
                        ? -1.20
                        : 1.20
                };

                c=E.BLACK;
            }


            /* INDICATOR */
            else if(region<.95){

                p={
                    x:4.73,
                    y:1.08+
                      s.x*.25,
                    z:
                        s.y<.5
                        ? -.98
                        : .98
                };

                c=E.YELLOW;
            }


            /* BLACK TRIM */
            else{

                p={
                    x:-2.40+
                      s.x*4.80,

                    y:.69+
                      s.y*.16,

                    z:
                        s.x<.5
                        ? -1.67
                        : 1.67
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