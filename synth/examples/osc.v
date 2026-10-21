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
