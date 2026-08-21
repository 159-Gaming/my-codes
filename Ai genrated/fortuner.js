"use strict";

window.ToyotaCars =
    window.ToyotaCars || {};


window.ToyotaCars["legender"] = {

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
            2.74;

        const rearWheel =
            -2.72;

        const wheelRadius =
            .82;


        const profile = [

            {x:-4.68,y:.58},

            {x:-4.49,y:.88},

            {x:-4.10,y:1.22},

            {x:-3.64,y:1.51},

            {x:-2.00,y:1.66},

            {x:-1.58,y:3.25},

            {x:.90,y:3.34},

            {x:1.18,y:1.64},

            {x:2.90,y:1.62},

            {x:4.14,y:1.42},

            {x:4.70,y:.78}
        ];


        for(
            let i=start;
            i<end;
            i++
        ){

            const s =
                T.sequence(
                    i,
                    22
                );


            const r =
                s.z;


            let p;
            let c;


            /*
               BODY
            */

            if(r<.39){

                const x =
                    -4.62+
                    s.x*9.24;


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
                            .22,
                            roof-.59
                        ),

                    z:
                        side*
                        1.49
                };


                c=E.AQUA;
            }


            /*
               BLACK ROOF
            */

            else if(r<.49){

                const x =
                    -1.60+
                    s.x*2.52;


                const roof =
                    T.profileY(
                        x,
                        profile
                    );


                p={

                    x,

                    y:
                        roof+.015,

                    z:
                        -1.43+
                        s.y*2.86
                };


                c=E.BLACK;
            }


            /*
               WINDOWS
            */

            else if(r<.64){

                const side =
                    s.y<.5?-1:1;


                const x =
                    -1.37+
                    s.x*2.34;


                const roof =
                    T.profileY(
                        x,
                        profile
                    );


                p={

                    x,

                    y:
                        2.02+
                        s.y*
                        (
                            roof-
                            2.02-
                            .11
                        ),

                    z:
                        side*1.61
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
                    x=.96;

                else if(s.x<.66)
                    x=-.03;

                else
                    x=-1.45;


                p={

                    x,

                    y:
                        1.99+
                        s.y*1.15,

                    z:
                        side*1.63
                };


                c=E.BLACK;
            }


            /*
               WHEELS
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
                        s.y<.5?-1.69:1.69
                    );


                c=E.BLACK;
            }


            /*
               ARCHES
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
                        side*1.73
                    );


                c=E.BLACK;
            }


            /*
               AGGRESSIVE CATAMARAN FRONT
            */

            else if(r<.89){

                const center =
                    s.y-.5;


                const flare =
                    Math.abs(center)*
                    .40;


                p={

                    x:4.77,

                    y:
                        .82+
                        s.x*.63,

                    z:
                        center*2.18+
                        (
                            center>0
                            ? flare
                            : -flare
                        )
                };


                c=E.BLACK;
            }


            /*
               SPLIT HEADLAMP ZONE
            */

            else if(r<.925){

                const side =
                    s.y<.5?-1:1;


                p={

                    x:4.80,

                    y:
                        1.38+
                        s.x*.28,

                    z:
                        side*
                        (
                            .92+
                            s.x*.27
                        )
                };


                c=E.BLACK;
            }


            /*
               YELLOW INDICATOR
            */

            else if(r<.952){

                const side =
                    s.y<.5?-1:1;


                p={

                    x:4.82,

                    y:
                        1.08+
                        s.x*.22,

                    z:
                        side*.91
                };


                c=E.YELLOW;
            }


            /*
               BLACK CATAMARAN BUMPER
            */

            else if(r<.978){

                const side =
                    s.y<.5?-1:1;


                p={

                    x:
                        4.78-
                        s.x*.16,

                    y:
                        .49+
                        s.x*.28,

                    z:
                        side*
                        (
                            .55+
                            s.y*.86
                        )
                };


                c=E.BLACK;
            }


            /*
               SPORT SIDE TRIM
            */

            else{

                const side =
                    s.y<.5?-1:1;


                p={

                    x:
                        -3.20+
                        s.x*6.40,

                    y:
                        .64+
                        s.y*.18,

                    z:
                        side*1.70
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