module root(input pin1, input pin2, input pin3, input pin4,
            output pin5, output pin7, output pin8);
    wire carry;
    sum s1(.a(pin1), .b(pin3), .s(pin8), .carry_in(1'b0), .carry_out(carry));
    sum s2(.a(pin2), .b(pin4), .s(pin7), .carry_in(carry), .carry_out(pin5));
endmodule

module sum(input a, input b, output s, input carry_in, output carry_out);
    assign s = a ^ b ^ carry_in;
    assign carry_out = (a & (b | carry_in)) | (b & carry_in);
endmodule
