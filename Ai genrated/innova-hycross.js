"use strict";

window.ToyotaCars =
    window.ToyotaCars || {};


window.ToyotaCars["innova-hycross"] = {

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
            2.61;

        const rearWheel =
            -2.62;

        const wheelRadius =
            .79;


        /*
           HYBRID SUV / MPV PROFILE

           More SUV-like shoulder than Crysta,
           but still long and spacious.
        */

        const profile = [

            {x:-4.60,y:.59},

            {x:-4.42,y:.92},

            {x:-4.08,y:1.22},

            {x:-3.60,y:1.37},

            {x:-2.00,y:1.56},

            {x:-1.64,y:2.94},

            {x:1.20,y:3.06},

            {x:1.44,y:1.54},

            {x:2.98,y:1.53},

            {x:4.09,y:1.37},

            {x:4.59,y:.79}
        ];


        for(
            let i=start;
            i<end;
            i++
        ){

            const s =
                T.sequence(
                    i,
                    55
                );


            const r =
                s.z;


            let p;
            let c;


            /*
               MAIN BODY
            */

            if(r<.38){

                const x =
                    -4.55+
                    s.x*9.10;


                const roof =
                    T.profileY(
                        x,
                        profile
                    );


                const side =
                    s.y<.5?-1:1;


                /*
                   Slight fender widening.
                */

                let width =
                    1.45;


                if(
                    x>-3.25 &&
                    x<3.30
                ){

                    width +=
                        .10*
                        Math.sin(
                            (
                                x+3.25
                            )*
                            Math.PI/
                            6.55
                        );
                }


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
                        side*width
                };


                c=E.AQUA;
            }


            /*
               RAISED BONNET
            */

            else if(r<.45){

                p={

                    x:
                        1.95+
                        s.x*2.60,

                    y:
                        1.46+
                        s.y*.14,

                    z:
                        -1.38+
                        s.y*2.76
                };


                c=E.AQUA;
            }


            /*
               ROOF
            */

            else if(r<.52){

                const x =
                    -1.64+
                    s.x*2.84;


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
               LARGE SIDE WINDOWS
            */

            else if(r<.66){

                const side =
                    s.y<.5?-1:1;


                const x =
                    -1.60+
                    s.x*2.94;


                const roof =
                    T.profileY(
                        x,
                        profile
                    );


                p={

                    x,

                    y:
                        1.87+
                        s.y*
                        (
                            roof-
                            1.87-
                            .10
                        ),

                    z:
                        side*1.58
                };


                c=E.BLACK;
            }


            /*
               PILLARS / BLACK FRAMES
            */

            else if(r<.72){

                const side =
                    s.y<.5?-1:1;


                let x;


                if(s.x<.30)
                    x=1.08;

                else if(s.x<.58)
                    x=.03;

                else
                    x=-1.23;


                p={

                    x,

                    y:
                        1.86+
                        s.y*1.12,

                    z:
                        side*1.63
                };


                c=E.BLACK;
            }


            /*
               WHEELS
            */

            else if(r<.81){

                const x =
                    s.x<.5
                    ? frontWheel
                    : rearWheel;


                p =
                    T.wheel(
                        s,
                        x,
                        wheelRadius,
                        s.y<.5?-1.64:1.64
                    );


                c=E.BLACK;
            }


            /*
               PRONOUNCED FENDER ARCHES
            */

            else if(r<.845){

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
                        wheelRadius*1.11,
                        side*1.72
                    );


                c=E.BLACK;
            }


            /*
               LARGE MODERN GRILLE
            */

            else if(r<.90){

                const z =
                    -1.16+
                    s.y*2.32;


                const taper =
                    Math.abs(z)/1.16;


                p={

                    x:
                        4.65,

                    y:
                        .76+
                        s.x*.72+
                        taper*.05,

                    z
                };


                c=E.BLACK;
            }


            /*
               TRI-EYE HEADLIGHT AREA
            */

            else if(r<.94){

                const side =
                    s.y<.5?-1:1;


                p={

                    x:
                        4.69,

                    y:
                        1.30+
                        s.x*.31,

                    z:
                        side*
                        (
                            .92+
                            s.x*.30
                        )
                };


                c=E.BLACK;
            }


            /*
               YELLOW INDICATOR
            */

            else if(r<.96){

                const side =
                    s.y<.5?-1:1;


                p={

                    x:
                        4.71,

                    y:
                        1.08+
                        s.x*.20,

                    z:
                        side*.88
                };


                c=E.YELLOW;
            }


            /*
               CHARACTER LINE
            */

            else if(r<.978){

                const side =
                    s.y<.5?-1:1;


                p={

                    x:
                        -3.10+
                        s.x*6.25,

                    y:
                        1.18+
                        s.y*.13,

                    z:
                        side*1.60
                };


                c=E.AQUA;
            }


            /*
               LOWER CLADDING
            */

            else{

                const side =
                    s.y<.5?-1:1;


                p={

                    x:
                        -2.90+
                        s.x*5.90,

                    y:
                        .63+
                        s.y*.18,

                    z:
                        side*1.63
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