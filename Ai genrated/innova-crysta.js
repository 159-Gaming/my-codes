"use strict";

window.ToyotaCars =
    window.ToyotaCars || {};


window.ToyotaCars["innova-crysta"] = {

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
            2.56;

        const rearWheel =
            -2.58;

        const wheelRadius =
            .77;


        /*
           LONG MPV PROFILE
        */

        const profile = [

            {x:-4.56,y:.59},

            {x:-4.40,y:.92},

            {x:-4.05,y:1.24},

            {x:-3.60,y:1.40},

            {x:-2.20,y:1.60},

            {x:-1.76,y:3.02},

            {x:1.30,y:3.16},

            {x:1.52,y:1.56},

            {x:2.90,y:1.55},

            {x:4.03,y:1.38},

            {x:4.55,y:.78}
        ];


        for(
            let i=start;
            i<end;
            i++
        ){

            const s =
                T.sequence(
                    i,
                    44
                );


            const r =
                s.z;


            let p;
            let c;


            /*
               LONG BODY
            */

            if(r<.40){

                const x =
                    -4.51+
                    s.x*9.02;


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
                        .58+
                        s.y*
                        Math.max(
                            .20,
                            roof-.58
                        ),

                    z:
                        side*1.47
                };


                c=E.AQUA;
            }


            /*
               LONG ROOF
            */

            else if(r<.50){

                const x =
                    -1.76+
                    s.x*3.08;


                const roof =
                    T.profileY(
                        x,
                        profile
                    );


                p={

                    x,

                    y:roof,

                    z:
                        -1.40+
                        s.y*2.80
                };


                c=E.AQUA;
            }


            /*
               LARGE MPV GLASSHOUSE
            */

            else if(r<.67){

                const side =
                    s.y<.5?-1:1;


                const x =
                    -1.78+
                    s.x*3.03;


                const roof =
                    T.profileY(
                        x,
                        profile
                    );


                p={

                    x,

                    y:
                        1.88+
                        s.y*
                        (
                            roof-
                            1.88-
                            .10
                        ),

                    z:
                        side*1.57
                };


                c=E.BLACK;
            }


            /*
               MULTIPLE PILLARS
            */

            else if(r<.735){

                const side =
                    s.y<.5?-1:1;


                let x;


                if(s.x<.28)
                    x=1.15;

                else if(s.x<.52)
                    x=.15;

                else if(s.x<.76)
                    x=-.88;

                else
                    x=-1.65;


                p={

                    x,

                    y:
                        1.87+
                        s.y*1.12,

                    z:
                        side*1.61
                };


                c=E.BLACK;
            }


            /*
               WHEELS
            */

            else if(r<.82){

                const x =
                    s.x<.5
                    ? frontWheel
                    : rearWheel;


                p =
                    T.wheel(
                        s,
                        x,
                        wheelRadius,
                        s.y<.5?-1.61:1.61
                    );


                c=E.BLACK;
            }


            /*
               ARCHES
            */

            else if(r<.855){

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
                        side*1.65
                    );


                c=E.BLACK;
            }


            /*
               LARGE GRILLE
            */

            else if(r<.90){

                p={

                    x:4.60,

                    y:
                        .72+
                        s.x*.72,

                    z:
                        -1.13+
                        s.y*2.26
                };


                c=E.BLACK;
            }


            /*
               GRILLE EDGE
            */

            else if(r<.928){

                p={

                    x:4.63,

                    y:
                        .75+
                        s.x*.68,

                    z:
                        -1.22+
                        s.y*2.44
                };


                c=E.AQUA;
            }


            /*
               HEADLAMP
            */

            else if(r<.95){

                const side =
                    s.y<.5?-1:1;


                p={

                    x:4.65,

                    y:
                        1.30+
                        s.x*.25,

                    z:
                        side*
                        (
                            .98+
                            s.x*.22
                        )
                };


                c=E.BLACK;
            }


            /*
               INDICATOR
            */

            else if(r<.968){

                const side =
                    s.y<.5?-1:1;


                p={

                    x:4.68,

                    y:
                        1.07+
                        s.x*.20,

                    z:
                        side*.90
                };


                c=E.YELLOW;
            }


            /*
               LOWER MPV TRIM
            */

            else{

                const side =
                    s.y<.5?-1:1;


                p={

                    x:
                        -3.0+
                        s.x*6.0,

                    y:
                        .62+
                        s.y*.18,

                    z:
                        side*1.62
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