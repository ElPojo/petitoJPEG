/**
 * petitóJPEG
 */


var imgElem = document.getElementById("img");;


/**
 * Returns an ImageData object 
 * @param imgElem
 */
function getPixelsFromImageElement(imgElem) {
// imgElem must be on the same server otherwise a cross-origin error will be thrown "SECURITY_ERR: DOM Exception 18"
    var canvas = document.createElement("canvas");
    canvas.width = imgElem.clientWidth;
    canvas.height = imgElem.clientHeight;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(imgElem, 0, 0);
    return ctx.getImageData(0,0,canvas.width,canvas.height);
}


var pttJPEG = (function namespace() {

    /**
     * BitWriter class
     *
     * A class to write bits to a random output
     *
     * Provide a byte sink by providing an object like ByteWriter with the setByteWriter method
     *
     */
    function BitWriter() {
        var bufsize = 1024*1024;
        var buf = new Uint8Array(bufsize);
        var bufptr = 0;
        var bitcount = 0;
        var bitcache = 0;
        var byteswritten = 0;

        // private methods
        function reset_writer() {
            byteswritten = 0;
            bufptr = 0;
            bitcount = 0;
        };

        function output_buffer() {
            if(bw) {
                bw.write(buf, 0, bufptr);
            }
            byteswritten += bufptr;
            bufptr = 0;
        };

        function emptybitbuffer(){
            do {  /* Check if we need to dump buffer*/
                if( bufptr >= bufsize  ) {
                    output_buffer(pbs);
                }
                var b = bitcache >> 24;

                if( b == 0xff ) { /*Add 0x00 stuffing*/
                    bitcache &= 0x00ffffff;
                    buf[bufptr++] = 0xff;
                    continue;
                }

                buf[bufptr++] = b;

                bitcache <<= 8;/* remove bits from bitcache*/
                bitcount -= 8;

            } while( bitcount >= 8 );
        }

        // This ensures there is at least 16 free bits in the buffer
        function emptybitbuffer_16(pbs) {
            /* the following loop always adds two bytes at least. to the bitcache*/
            if( bitcount >16   ){
                emptybitbuffer();
            }
        }

        function shovebits( val,  bits) {
            bitcache |= (val & ((1<<(bits))-1))  << (32 - bitcount - bits ); 
            bitcount+= bits; 
        }



        function flush_buffers() {
            align8();
            if(bitcount>=8) {
                emptybitbuffer();
                output_buffer();
            }
        }

        // public API
        this.ByteWriter = function() {
            // writes count bytes starting at start position from array
            // array is Uint8Array()
            this.write = function( array, start, count ){};
        }

        var bw = new ByteWriter(); 

        this.putbits = function (val, bits) {
            emptybitbuffer_16();
            shovebits(val, bits);
        }

        this.align8 = function () {
            putbits( 0xff, ((32 - bitcount)&0x7) );
        }

        this.setByteWriter = function( bww ) {
            bw = bww;
        };

        this.putshort = function(s) {
            flush_buffers();
            buf[bufptr++]=s>>8;
            buf[bufptr++]=s&0xff;
        }

        this.putbyte = function(b) {
            flush_buffers();
            buf[bufptr++]=b;
        };
    }


    var std_dc_luminance_nrcodes = new Uint32Array([0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0]);
    var std_dc_luminance_values = new Uint32Array([0,1,2,3,4,5,6,7,8,9,10,11]);
    var std_ac_luminance_nrcodes = new Uint32Array([0,0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,0x7d]);
    var std_ac_luminance_values = new Uint32Array([0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,
            0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,
            0x22,0x71,0x14,0x32,0x81,0x91,0xa1,0x08,
            0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,
            0x24,0x33,0x62,0x72,0x82,0x09,0x0a,0x16,
            0x17,0x18,0x19,0x1a,0x25,0x26,0x27,0x28,
            0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,
            0x3a,0x43,0x44,0x45,0x46,0x47,0x48,0x49,
            0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,
            0x5a,0x63,0x64,0x65,0x66,0x67,0x68,0x69,
            0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,
            0x7a,0x83,0x84,0x85,0x86,0x87,0x88,0x89,
            0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,
            0x99,0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,
            0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,
            0xb7,0xb8,0xb9,0xba,0xc2,0xc3,0xc4,0xc5,
            0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,
            0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,
            0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,
            0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
            0xf9,0xfa]);

    var std_dc_chrominance_nrcodes = new Uint32Array([0,0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0]);
    var std_dc_chrominance_values = new Uint32Array([0,1,2,3,4,5,6,7,8,9,10,11]);
    var std_ac_chrominance_nrcodes = new Uint32Array([0,0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,0x77]);
    var std_ac_chrominance_values = new Uint32Array([0x00,0x01,0x02,0x03,0x11,0x04,0x05,0x21,
            0x31,0x06,0x12,0x41,0x51,0x07,0x61,0x71,
            0x13,0x22,0x32,0x81,0x08,0x14,0x42,0x91,
            0xa1,0xb1,0xc1,0x09,0x23,0x33,0x52,0xf0,
            0x15,0x62,0x72,0xd1,0x0a,0x16,0x24,0x34,
            0xe1,0x25,0xf1,0x17,0x18,0x19,0x1a,0x26,
            0x27,0x28,0x29,0x2a,0x35,0x36,0x37,0x38,
            0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,
            0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,
            0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,
            0x69,0x6a,0x73,0x74,0x75,0x76,0x77,0x78,
            0x79,0x7a,0x82,0x83,0x84,0x85,0x86,0x87,
            0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,
            0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,
            0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,
            0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,
            0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,
            0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,
            0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,
            0xea,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
            0xf9,0xfa
                ]);

    var jpeg_natural_order = new Uint32Array([
            0,  1,  8, 16,  9,  2,  3, 10,
            17, 24, 32, 25, 18, 11,  4,  5,
            12, 19, 26, 33, 40, 48, 41, 34,
            27, 20, 13,  6,  7, 14, 21, 28,
            35, 42, 49, 56, 57, 50, 43, 36,
            29, 22, 15, 23, 30, 37, 44, 51,
            58, 59, 52, 45, 38, 31, 39, 46,
            53, 60, 61, 54, 47, 55, 62, 63,
            63, 63, 63, 63, 63, 63, 63, 63, /* extra entries for safety in decoder */
            63, 63, 63, 63, 63, 63, 63, 63
            ]);

    /* zig zag scan table */
    var zz = new Uint32Array([
            0, 1, 5, 6,14,15,27,28,
            2, 4, 7,13,16,26,29,42,
            3, 8,12,17,25,30,41,43,
            9,11,18,24,31,40,44,53,
            10,19,23,32,39,45,52,54,
            20,22,33,38,46,51,55,60,
            21,34,37,47,50,56,59,61,
            35,36,48,49,57,58,62,63
            ]);

    /* aan dct scale factors */
    var aasf = new Float64Array([
            1.0, 1.387039845, 1.306562965, 1.175875602,
            1.0, 0.785694958, 0.541196100, 0.275899379
            ]);

    /* default quantization tables */
    var YQT = new Uint32Array([
            16, 11, 10, 16, 24, 40, 51, 61,
            12, 12, 14, 19, 26, 58, 60, 55,
            14, 13, 16, 24, 40, 57, 69, 56,
            14, 17, 22, 29, 51, 87, 80, 62,
            18, 22, 37, 56, 68,109,103, 77,
            24, 35, 55, 64, 81,104,113, 92,
            49, 64, 78, 87,103,121,120,101,
            72, 92, 95, 98,112,100,103, 99
            ]);

    var UVQT = new Uint32Array([
            17, 18, 24, 47, 99, 99, 99, 99,
            18, 21, 26, 66, 99, 99, 99, 99,
            24, 26, 56, 99, 99, 99, 99, 99,
            47, 66, 99, 99, 99, 99, 99, 99,
            99, 99, 99, 99, 99, 99, 99, 99,
            99, 99, 99, 99, 99, 99, 99, 99,
            99, 99, 99, 99, 99, 99, 99, 99,
            99, 99, 99, 99, 99, 99, 99, 99
            ]);

    /**
     *  Defining the class here
     *
     */
    function PTTJPEG() {
        this.imgdata = getPixelsFromImageElement(imgElem);
        this.width = this.imgdata.width;
        this.height = this.imgdata.height;

        /* private context variables */
        var fdtbl_Y = new Float64Array(64);
        var fdtbl_UV = new Float64Array(64);
        var YDU = new Float64Array(64);
        var UDU = new Float64Array(64);
        var VDU = new Float64Array(64);

        var DU = new Int32Array(64);
        var YTable = new Int32Array(64);
        var UVTable = new Int32Array(64);
        var outputfDCTQuant = new Int32Array(64);

        var sf = 1; // int. the scale factor



        /** 
         * BitString class
         */
        function BitString() {
            this.val = 0;
            this.len = 0;
        };

        var YDC_HT = new Array(256);
        var UVDC_HT= new Array(256);
        var YAC_HT = new Array(256);
        var UVAC_HT= new Array(256);





        /**
         * var quality:int
         * 
         */
        var init_quality_settings = function (quality) {
            if (quality <= 0)
                quality = 1;

            if (quality > 100)
                quality = 100;

            sf = quality < 50 ? ~~(5000 / quality) : ~~(200 - (quality<<1));

            /* init quantization tables */
            init_quant_tables(sf);
        };

        /** 
         * var sf:int: the scale factor
         * @returns
         */
        var init_quant_tables = function (sff)	{
            var i;
            var I64 = 64;
            var I8 = 8;

            for (i = 0; i < I64; ++i)
            {
                var t = ~~((YQT[i]*sff+50)*0.01);
                if (t < 1) {
                    t = 1;
                } else if (t > 255) {
                    t = 255;
                }
                YTable[zz[i]] = t;
            }

            for (i = 0; i < I64; i++)
            {
                var u = ~~((UVQT[i]*sff+50)*0.01);
                if (u < 1) {
                    u = 1;
                } else if (u > 255) {
                    u = 255;
                }
                UVTable[zz[i]] = u;
            }
            i = 0;
            var row;
            var col;
            for (row = 0; row < I8; ++row)
            {
                for (col = 0; col < I8; ++col)
                {
                    fdtbl_Y[i]  = (1 / (YTable [zz[i]] * aasf[row] * aasf[col] * I8));
                    fdtbl_UV[i] = (1 / (UVTable[zz[i]] * aasf[row] * aasf[col] * I8));
                    i++;
                }
            }
        };

        /**
         * const int nrcodes[]
         * const int std_table[]
         * BitString HT, Array(BitsString) 
         *
         */
        var computeHuffmanTbl = function (nrcodes, std_table, HT)
        {
            var codevalue = 0;    //int
            var pos_in_table = 0; //int
            var k,j;                //int
            var bs;     //BitString object

            for (k=1; k<=16; ++k)
            {
                for (j=1; j<=nrcodes[k]; ++j)
                {
                    var bs = new BitString();
                    bs.val = codevalue;
                    bs.len = k;
                    HT[std_table[pos_in_table]] = bs;
                    pos_in_table++;
                    codevalue++;
                }
                codevalue<<=1;
            }
        }


        /**
         * Initialize huffman tables
         */ 
        var init_huffman_tables = function() 
        {
            computeHuffmanTbl(std_dc_luminance_nrcodes,std_dc_luminance_values,YDC_HT);
            computeHuffmanTbl(std_dc_chrominance_nrcodes,std_dc_chrominance_values, UVDC_HT);
            computeHuffmanTbl(std_ac_luminance_nrcodes,std_ac_luminance_values, YAC_HT);
            computeHuffmanTbl(std_ac_chrominance_nrcodes,std_ac_chrominance_values, UVAC_HT); 
        }

        /** 
         *
         * DCT and quantization core
         *
         * double data[]
         * double fdtbl[]
         *
         * returns quantized coefficients
         *
         */
        function fDCTQuant( data, fdtbl) {
            /* Pass 1: process rows. */
            var dataOff=0;
            var d0,d1,d2,d3,d4,d5,d6,d7;
            var i;
            var I8 = 8;
            var I64 = 64;

            for (i=0; i<I8; ++i)
            {	
                d0 = data[dataOff];
                d1 = data[dataOff+1];
                d2 = data[dataOff+2];
                d3 = data[dataOff+3];
                d4 = data[dataOff+4];
                d5 = data[dataOff+5];
                d6 = data[dataOff+6];
                d7 = data[dataOff+7];

                var tmp0 = d0 + d7;
                var tmp7 = d0 - d7;
                var tmp1 = d1 + d6;
                var tmp6 = d1 - d6;
                var tmp2 = d2 + d5;
                var tmp5 = d2 - d5;
                var tmp3 = d3 + d4;
                var tmp4 = d3 - d4;

                /* Even part */
                var tmp10 = tmp0 + tmp3;	/* phase 2 */
                var tmp13 = tmp0 - tmp3;
                var tmp11 = tmp1 + tmp2;
                var tmp12 = tmp1 - tmp2;

                data[dataOff   ] = tmp10 + tmp11; /* phase 3 */
                data[dataOff+4 ] = tmp10 - tmp11;

                var z1 = (tmp12 + tmp13) * 0.707106781; /* c4 */
                data[dataOff+2] = tmp13 + z1; /* phase 5 */
                data[dataOff+6] = tmp13 - z1;

                /* Odd part */
                tmp10 = tmp4 + tmp5; /* phase 2 */
                tmp11 = tmp5 + tmp6;
                tmp12 = tmp6 + tmp7;

                /* The rotator is modified from fig 4-8 to avoid extra negations. */
                var z5 = (tmp10 - tmp12) * 0.382683433; /* c6 */
                var z2 = 0.541196100 * tmp10 + z5; /* c2-c6 */
                var z4 = 1.306562965 * tmp12 + z5; /* c2+c6 */
                var z3 = tmp11 * 0.707106781; /* c4 */

                var z11 = tmp7 + z3;	/* phase 5 */
                var z13 = tmp7 - z3;

                data[dataOff+5] = z13 + z2;	/* phase 6 */
                data[dataOff+3] = z13 - z2;
                data[dataOff+1] = z11 + z4;
                data[dataOff+7] = z11 - z4;

                dataOff += 8; /* advance pointer to next row */
            }

            /* Pass 2: process columns. */
            dataOff = 0;
            for (i=0; i<I8; ++i)
            {
                d0 = data[dataOff];
                d1 = data[dataOff + 8];
                d2 = data[dataOff + 16];
                d3 = data[dataOff + 24];
                d4 = data[dataOff + 32];
                d5 = data[dataOff + 40];
                d6 = data[dataOff + 48];
                d7 = data[dataOff + 56];

                var tmp0p2 = d0 + d7;
                var tmp7p2 = d0 - d7;
                var tmp1p2 = d1 + d6;
                var tmp6p2 = d1 - d6;
                var tmp2p2 = d2 + d5;
                var tmp5p2 = d2 - d5;
                var tmp3p2 = d3 + d4;
                var tmp4p2 = d3 - d4;

                /* Even part */
                var tmp10p2 = tmp0p2 + tmp3p2;	/* phase 2 */
                var tmp13p2 = tmp0p2 - tmp3p2;
                var tmp11p2 = tmp1p2 + tmp2p2;
                var tmp12p2 = tmp1p2 - tmp2p2;

                data[dataOff] = tmp10p2 + tmp11p2; /* phase 3 */
                data[dataOff+32] = tmp10p2 - tmp11p2;

                var z1p2 = (tmp12p2 + tmp13p2) * 0.707106781; /* c4 */
                data[dataOff+16] = tmp13p2 + z1p2; /* phase 5 */
                data[dataOff+48] = tmp13p2 - z1p2;

                /* Odd part */
                tmp10p2 = tmp4p2 + tmp5p2; /* phase 2 */
                tmp11p2 = tmp5p2 + tmp6p2;
                tmp12p2 = tmp6p2 + tmp7p2;

                /* The rotator is modified from fig 4-8 to avoid extra negations. */
                var z5p2 = (tmp10p2 - tmp12p2) * 0.382683433; /* c6 */
                var z2p2 = 0.541196100 * tmp10p2 + z5p2; /* c2-c6 */
                var z4p2 = 1.306562965 * tmp12p2 + z5p2; /* c2+c6 */
                var z3p2= tmp11p2 * 0.707106781; /* c4 */

                var z11p2 = tmp7p2 + z3p2;	/* phase 5 */
                var z13p2 = tmp7p2 - z3p2;

                data[dataOff+40] = z13p2 + z2p2; /* phase 6 */
                data[dataOff+24] = z13p2 - z2p2;
                data[dataOff+ 8] = z11p2 + z4p2;
                data[dataOff+56] = z11p2 - z4p2;

                dataOff++; /* advance po(int)er to next column */
            }

            // Quantize/descale the coefficients
            var fDCTQuant;
            for (i=0; i<I64; ++i)
            {
                // Apply the quantization and scaling factor & Round to nearest (int)eger
                fDCTQuant = data[i]*fdtbl[i];
                outputfDCTQuant[i] = (fDCTQuant > 0.0) ? ~~(fDCTQuant + 0.5) : ~~(fDCTQuant - 0.5);
            }
            return outputfDCTQuant;
        }

        //-------------------------------------------------------------------------------------------
        // chunk writing routines
        function writeAPP0()
        {
            bitwriter.putshort( 0xFFE0); // marker
            bitwriter.putshort( 16); // length
            bitwriter.putbyte( 0x4A); // J
            bitwriter.putbyte( 0x46); // F
            bitwriter.putbyte( 0x49); // I
            bitwriter.putbyte( 0x46); // F
            bitwriter.putbyte( 0); // = "JFIF"'\0'
            bitwriter.putbyte( 1); // versionhi
            bitwriter.putbyte( 1); // versionlo
            bitwriter.putbyte( 0); // xyunits
            bitwriter.putshort( 1); // xdensity
            bitwriter.putshort( 1); // ydensity
            bitwriter.putbyte( 0); // thumbnwidth
            bitwriter.putbyte( 0); // thumbnheight
        }


        // width:int, height:int
        function writeSOF0( width, height)
        {
            bitwriter.putshort(0xFFC0); // marker
            bitwriter.putshort(17);   // length, truecolor YUV JPG
            bitwriter.putbyte(8);    // precision
            bitwriter.putshort(height);
            bitwriter.putshort(width);
            bitwriter.putbyte(3);    // nrofcomponents
            bitwriter.putbyte(1);    // IdY
            bitwriter.putbyte(0x11); // HVY
            bitwriter.putbyte(0);    // QTY
            bitwriter.putbyte(2);    // IdU
            bitwriter.putbyte(0x11); // HVU
            bitwriter.putbyte(1);    // QTU
            bitwriter.putbyte(3);    // IdV
            bitwriter.putbyte(0x11); // HVV
            bitwriter.putbyte(1);    // QTV
        }

        function writeDQT()
        {
            bitwriter.putshort(0xFFDB); // marker
            bitwriter.putshort(132);	   // length
            bitwriter.putbyte(0);

            var i;
            var I64=64;
            for (i=0; i<I64; ++i)
                bitwriter.putbyte(YTable[i]);

            bitwriter.putbyte(1);

            for (i=0; i<I64; ++i)
                bitwriter.putbyte(UVTable[i]);
        }

        function writeDHT()
        {
            bitwriter.putshort( 0xFFC4); // marker
            bitwriter.putshort( 0x01A2); // length

            bitwriter.putbyte(0); // HTYDCinfno
            var i;
            var I11=11;
            var I16=16;
            var I161=161;

            for (i=0; i<I16; ++i) {
                bitwriter.putbyte(std_dc_luminance_nrcodes[i+1]);
            }

            for (i=0; i<=I11; ++i)
                bitwriter.putbyte(std_dc_luminance_values[i]);

            bitwriter.putbyte(0x10); // HTYACinfo

            for (i=0; i<I16; ++i)
                bitwriter.putbyte(std_ac_luminance_nrcodes[i+1]);

            for (i=0; i<=I161; ++i)
                bitwriter.putbyte(std_ac_luminance_values[i]);

            bitwriter.putbyte(1); // HTUDCinfo

            for (i=0; i<I16; ++i)
                bitwriter.putbyte(std_dc_chrominance_nrcodes[i+1]);

            for (i=0; i<=I11; ++i)
                bitwriter.putbyte(std_dc_chrominance_values[i]);

            bitwriter.putbyte(0x11); // HTUACinfo

            for (i=0; i<I16; ++i)
                bitwriter.putbyte(std_ac_chrominance_nrcodes[i+1]);

            for (i=0; i<=I161; ++i)
                bitwriter.putbyte(std_ac_chrominance_values[i]);
        }

        function writeSOS()
        {
            bitwriter.putshort(0xFFDA); // marker
            bitwriter.putshort(12); // length
            bitwriter.putbyte(3); // nrofcomponents
            bitwriter.putbyte(1); // IdY
            bitwriter.putbyte(0); // HTY
            bitwriter.putbyte(2); // IdU
            bitwriter.putbyte(0x11); // HTU
            bitwriter.putbyte(3); // IdV
            bitwriter.putbyte(0x11); // HTV
            bitwriter.putbyte(0); // Ss
            bitwriter.putbyte(0x3f); // Se
            bitwriter.putbyte(0); // Bf
        }

        function writeEOI()
        {
            bitwriter.align8();
            bitwriter.putshort(0xFFD9); //EOI
        }

        //--------------------------------------------------------------------
        // Block Processing

        function huffman_extend(mag,size) { return ((mag) < (1<<((size)-1)) ? (mag) + (((-1)<<(size)) + 1) : (mag)); }
        function huffman_compact(mag,size) { return ((mag)<0 ? mag + (1<<size)-1 : mag); }
        function log2(x, res) {res = 0; while( x!=0 ){ x>>=1; res++; } return res; }
        function abs(x) { return ((x)>0?(x):(-(x)))}

        /** 
         * double CDU[]
         * double fdtbl[]
         * double DC
         * BitString HTDC[]
         * BitString HTAC[]
         *
         * Returns double
         */
        function processDU( CDU, fdtbl, DC, HTDC, HTAC )
        {

            var DU_DCT = fDCTQuant(ctx, CDU, fdtbl);

            var dc_diff; //int
            var last_dc; // double

            // output
            // DC Bits
            dc_diff = DU_DCT[0] - ~~DC;
            last_dc = DU_DCT[0];
            ///////////////////////
            //DC CODING

            // DC Size
            var dc_size = 0, diffabs = ABS(dc_diff);    
            dc_size = log2(diffabs, dc_size);

            bitwriter.putbits(HTDC[dc_size].val, HTDC[dc_size].len );

            // DC Bits
            if( dc_size )
            {
                dc_diff = huffman_compact(dc_diff, dc_size);
                bitwriter.putbits( dc_diff, dc_size );
            }

            ////////////////////
            // AC CODING
            var run;
            var accoeff; //int16
            var lastcoeff_pos = 0; //ui32
            var maxcoeff = 64; // int

            var i = 0;
            while( 1 )
            {
                // find next coefficient to code
                i++;
                for( run=0 ;(accoeff = DU_DCT[ jpeg_natural_order[i] ])== 0 && i<maxcoeff; i++, run++);

                if( i>= maxcoeff )
                    break;

                // Code runs greater than 16
                while( run>= 16 )
                {
                    // Write value
                    bitwriter.putbits(HTAC[0xf0].val, HTAC[0xf0].len );
                    run -= 16;
                }
                // AC Size
                var acsize = 0;
                var acabs = ABS(accoeff);
                acsize = log2(acabs, acsize);

                // Write value
                var hv = (run << 4) | acsize;
                bitwriter.putbits(HTAC[hv].val, HTAC[hv].len );

                // AC Bits
                if( acsize )
                {
                    accoeff = huffman_compact(accoeff, acsize);
                    bitwriter.putbits(accoeff, acsize );
                }

                // Keep position of last encoded coefficient
                lastcoeff_pos = i;
            }

            // Write EOB 
            if( lastcoeff_pos != 63 )
                bitwriter.putbits(HTAC[0].val, HTAC[0].len );


            return last_dc;
        }


        function rgb2yuvpel(P,Y,U,V) {
            int R = ((P)>>8)&0xFF;
            int G= ((P)>> 16)&0xFF;
            int B= ((P)>>24 )&0xFF;
            (Y) =((( 0.29900)*R+( 0.58700)*G+( 0.11400)*B))-0x80;
            (U) =(((-0.16874)*R+(-0.33126)*G+( 0.50000)*B));
            (V) =((( 0.50000)*R+(-0.41869)*G+(-0.08131)*B)); 
        }

        /**
         * xpos:int
         * ypos:int
         *
         * This functions calls the getpixels() object to obtain an McuImg object that contains
         * an Uint8Array() buffer with pixel data in RGBA byte order. McuImg includes an offset
         * to the beginning of the requested area as well as the stride in bytes.
         *
         * The method converts the RGB pixels into YUV ready for further processing. The destination
         * pixels are written to the local private PTTJPEG fields YDU,UDU,VDU
         *
         */
        function rgb2yuv_444( xpos, ypos)
        {
            getpixels_if_t *gp = ctx->gp;

            // RGBA format in unpacked bytes
            mcuimg = gp.getpixels( xpos, ypos, 8, 8);

            //DEBUGMSG("getpixels() xpos:%d ypos:%d retw:%d reth:%d", xpos, ypos, mcuimg->w, mcuimg->h );

            var buf = mcuimg.buf;
            var pel;
            var P=0;
            var x,y,off,off_1,R,G,B;
            

            if( mcuimg.w==8 && mcuimg.h==8 ) {
                /* block is 8x8 */
                for ( y=0; y<8; y++) {        
                    for (x=0; x<8; x++) {
                        off = mcuimg.offset + y*mcuimg.stride + x*4;
                        R = buf[off];
                        G = buf[off+1];
                        B = buf[off+2];

                        P = mcuimg.buf[  ];
                        P = *pel++;
                        RGB2YUVPEL(P, *YDU++, *UDU++, *VDU++);
                    }
                    row += mcuimg->stride;
                    pel = (ptt_ui32 *)row;
                }
            } else {
                /* block is not 8x8 */
                for (y=0; y<8; y++) {
                    if( y<mcuimg->h ) {        
                        for (x=0; x<8; x++) {
                            P = x>=mcuimg->w ? P: *pel++; /* pad pixel on border conditions */
                            RGB2YUVPEL(P, *YDU++, *UDU++, *VDU++);
                        }

                        row += mcuimg->stride;
                        pel = (ptt_ui32 *)row;
                    } else {
                        YDU = ctx->YDU;
                        UDU = ctx->UDU;
                        VDU = ctx->VDU;
                        for (x=0; x<8; x++) {
                            off = (y<<3)+x;
                            off_1 = ((y-1)<<3)+x;
                            YDU[off]=YDU[off_1];
                            UDU[off]=UDU[off_1];
                            VDU[off]=VDU[off_1];
                        }
                    }
                }
            }
        }

        //--------------------------------------------------------------------

        // initialization
        init_quality_settings(50);


        // exported functions
        this.version = function() { return "0.3"; };


        /**
         * Setup the encoding envinment object
         */
        var startup = (function() {
            init_huffman_tables();
        }());
    }





    return PTTJPEG; 
}());

var test = new pttJPEG();
var v = test.version();
console.log(v);
