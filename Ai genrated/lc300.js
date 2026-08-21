"use strict";

window.ToyotaCars =
    window.ToyotaCars || {};


window.ToyotaCars["lc300"] = {

    buildRange(
        start,
        end,
        positions,
        colors,
        count
    ){

        const T =
            window.ToyotaShapeTools;

        const E =
            window.ToyotaEngine;


        const frontWheel =
            2.82;

        const rearWheel =
            -2.82;

        const wheelRadius =
            .87;


        const profile = [

            {x:-4.92,y:.60},

            {x:-4.74,y:.95},

            {x:-4.50,y:1.25},

            {x:-4.02,y:1.52},

            {x:-2.18,y:1.79},

            {x:-1.80,y:3.45},

            {x:1.03,y:3.52},

            {x:1.26,y:1.77},

            {x:3.04,y:1.75},

            {x:4.38,y:1.52},

            {x:4.92,y:.78}
        ];


        for(
            let i=start;
            i<end;
            i++
        ){

            const s =
                T.sequence(
                    i,
                    33
                );


            const r =
                s.z;


            let p;
            let c;


            /*
               MUSCULAR BODY
            */

            if(r<.38){

                const x =
                    -4.86+
                    s.x*9.72;


                const roof =
                    T.profileY(
                        x,
                        profile
                    );


                const side =
                    s.y<.5?-1:1;


                p={

                    x,

                    y:
                        .59+
                        s.y*
                        Math.max(
                            .26,
                            roof-.59
                        ),

                    z:
                        side*
                        1.60
                };


                c=E.AQUA;
            }


            /*
               UPPER SHOULDER
            */

            else if(r<.46){

                const x =
                    -3.90+
                    s.x*7.80;


                const roof =
                    T.profileY(
                        x,
                        profile
                    );


                p={

                    x,

                    y:
                        roof-
                        s.y*.10,

                    z:
                        -1.54+
                        s.y*3.08
                };


                c=E.AQUA;
            }


            /*
               ROOF
            */

            else if(r<.53){

                const x =
                    -1.78+
                    s.x*2.80;


                const roof =
                    T.profileY(
                        x,
                        profile
                    );


                p={

                    x,

                    y:roof,

                    z:
                        -1.49+
                        s.y*2.98
                };


                c=E.AQUA;
            }


            /*
               WINDOWS
            */

            else if(r<.65){

                const side =
                    s.y<.5?-1:1;


                const x =
                    -1.55+
                    s.x*2.52;


                const roof =
                    T.profileY(
                        x,
                        profile
                    );


                p={

                    x,

                    y:
                        2.06+
                        s.y*
                        (
                            roof-
                            2.06-
                            .11
                        ),

                    z:
                        side*1.68
                };


                c=E.BLACK;
            }


            /*
               PILLARS
            */

            else if(r<.70){

                const side =
                    s.y<.5?-1:1;


                let x;

                if(s.x<.33)
                    x=.95;

                else if(s.x<.67)
                    x=-.03;

                else
                    x=-1.57;


                p={

                    x,

                    y:
                        2.01+
                        s.y*1.25,

                    z:
                        side*1.70
                };


                c=E.BLACK;
            }


            /*
               LARGE WHEELS
            */

            else if(r<.80){

                const x =
                    s.x<.5
                    ? frontWheel
                    : rearWheel;


                p =
                    T.wheel(
                        s,
                        x,
                        wheelRadius,
                        s.y<.5?-1.78:1.78
                    );


                c=E.BLACK;
            }


            /*
               WHEEL ARCHES
            */

            else if(r<.835){

                const x =
                    s.x<.5
                    ? frontWheel
                    : rearWheel;


                const side =
                    s.y<.5?-1:1;


                p =
                    T.wheelArch(
                        s,
                        x,
                        wheelRadius*1.08,
                        side*1.82
                    );


                c=E.BLACK;
            }


            /*
               MASSIVE FRONT GRILLE
            */

            else if(r<.895){

                const z =
                    -1.42+
                    s.y*2.84;


                p={

                    x:
                        4.99,

                    y:
                        .68+
                        s.x*.98,

                    z
                };


                c=E.BLACK;
            }


            /*
               SECONDARY GRILLE BARS
            */

            else if(r<.925){

                const z =
                    -1.37+
                    s.y*2.74;


                p={

                    x:
                        5.01+
                        s.x*.06,

                    y:
                        .80+
                        s.x*.56,

                    z
                };


                c=E.AQUA;
            }


            /*
               HEADLAMPS
            */

            else if(r<.95){

                const side =
                    s.y<.5?-1:1;


                p={

                    x:
                        5.03,

                    y:
                        1.42+
                        s.x*.24,

                    z:
                        side*
                        (
                            1.18+
                            s.x*.20
                        )
                };


                c=E.BLACK;
            }


            /*
               INDICATOR
            */

            else if(r<.97){

                const side =
                    s.y<.5?-1:1;


                p={

                    x:
                        5.05,

                    y:
                        1.10+
                        s.x*.23,

                    z:
                        side*.98
                };


                c=E.YELLOW;
            }


            /*
               LOWER BUMPER
            */

            else{

                const side =
                    s.y<.5?-1:1;


                p={

                    x:
                        4.94-
                        s.x*.18,

                    y:
                        .48+
                        s.x*.30,

                    z:
                        side*
                        (
                            .62+
                            s.y*.92
                        )
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
    }
};