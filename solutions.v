module root (
    input  pin1, // A0: верхний слева
    input pin2,
    input pin3,
  input pin4,
   output pin5,
   output pin6,
   output pin7,
    output pin8  // Y0: верхний справа
);
  assign {pin8, pin7, pin6, pin5} = ~{pin1, pin2, pin3, pin4};
endmodule

-----------------------
module root (
    input  pin1, // A0: верхний слева
    input pin2,
    output pin3,
   output pin5,
   input pin6,
   input pin7
);
  assign pin3 = pin1 & pin2, pin5 = pin6 & pin7;
endmodule
---------------------
module root (
    input  pin1,
    input pin2,
    input pin3,
    input pin4,
  
   output pin6,
   output pin7
);
  wire [3:0] values = {pin1, pin2, pin3, pin4};
  assign pin6 = |values, pin7 = &values;
endmodule

-----------------

module root (
   output pin6,
   output pin7
);
  por #(.DEPTH(10)) startup (.out(pin6));
  assign pin7 = ~pin6;
endmodule


module root (
   output pin6,
   output pin7
);
  wire rst;
  por #(.DEPTH(10)) startup (.out(rst));
  assign pin7 = ~rst, pin6 = rst;
endmodule
module root (
   output pin6,
   output pin7
);
  wire pre_out;
  por #(.DEPTH(10)) startup (.out(pin6), .pre_out(pre_out));
  assign pin7 = ~pre_out;
endmodule
------------------------

module root(input pin1, output pin4);

wire dl1_in = pin1 & ~dl2_out;
wire mid, dl2_out;

delay_line #(.DEPTH(5)) dl1(.in(dl1_in), .out(mid));
delay_line #(.DEPTH(5)) dl2(.in(mid), .out(dl2_out));
assign pin4 = mid;
endmodule
///
module root(input pin1, input pin8, output pin4, output pin5);
  osc osc1(.en(pin1), .out(pin4));
  osc osc2(.en(pin8), .out(pin5));
endmodule

module osc(input en, output out);

wire dl1_in = en & ~dl2_out;
wire mid, dl2_out;

  delay_line #(.DEPTH(9)) dl1(.in(dl1_in), .out(mid));
  delay_line #(.DEPTH(9)) dl2(.in(mid), .out(dl2_out));
assign out = en & ~mid;
endmodule

--06
module root (input pin1, input pin2, output pin4, output pin5, input pin7, input pin8);
rs_trigger rs1(.s(pin1), .r(pin2), .out(pin4));
rs_trigger rs2(.s(pin8), .r(pin7), .out(pin5));
endmodule 
---- 07
module root (input pin1, output pin4, output pin5, input pin8);

  t_trigger t1(.t(pin1), .d(pin4)), t2(.t(pin8), .d(pin5));
endmodule 

module t_trigger(input t, output d);
wire edge;
positive_edge_detector ed(.in(t), .out(edge));
xor xor1(.a(edge), .b(d), .o(d));
endmodule

module xor(input a, input b, output o);
wire o1, o2;
  transistor_n tr1( .s(1'b1), .g(a), .d(o1)),
 tr2(.s(o2), .g(b), .d(o));
  transistor_p tr3(.s(1'b1), .g(a), .d(o2)),
  tr4(.s(o1), .g(b), .d(o));
endmodule
------------ 11

module root (input pin2, output pin7);

wire edge,d1,d2;
//wire x2in = edge & ~d1;
wire x2in;
transistor_p tr1(.s(edge), .g(d1), .d(x2in));
positive_edge_detector ed(.in(pin2), .out(edge));
  xor xor1(.a(edge), .b(d1), .o(d1)),
  xor2(.a(x2in), .b(d2), .o(d2));
assign pin7=d2;
endmodule

module xor(input a, input b, output o);
wire o1, o2;
  transistor_n tr1( .s(1'b1), .g(a), .d(o1)),
 tr2(.s(o2), .g(b), .d(o));
  transistor_p tr3(.s(1'b1), .g(a), .d(o2)),
  tr4(.s(o1), .g(b), .d(o));
endmodule



--------------------

--09
module root (
    input pin2, input pin3,
	output pin5, output pin6, output pin7, output pin8
);
  wire [1:0] sel = {pin3, pin2};

    assign {pin5, pin6, pin7, pin8} = 4'b1 << sel;
endmodule

--10
module root (
    input  pin1,
    input pin2,
    input pin3,
    input pin4,
    output pin5,
    output pin7,
    output pin8
	);
wire carry;
sum s1 ( .a(pin1), .b(pin3), .s(pin8), .carry_in(1'b0), .carry_out(carry));
sum s2 (.a(pin2), .b(pin4), .s(pin7), .carry_in(carry), .carry_out(pin5));
endmodule

module sum(input a, input b, output s, input carry_in, output carry_out);
assign s = a ^ b ^ carry_in;
assign carry_out = (a&(b | carry_in)) | (b & carry_in);
endmodule



----12
module root (
    input pin1, input pin2, input pin3, input pin4,
    input pin5, input pin6,
    output pin8
);
  wire [3:0] data = {pin4, pin3, pin2, pin1};
  wire [1:0] sel = {pin5, pin6};

    assign pin8 = data[sel];
endmodule

