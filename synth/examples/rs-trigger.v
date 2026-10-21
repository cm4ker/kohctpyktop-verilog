module root(input pin1, input pin2, output pin8);
    rs_trigger memory(.r(pin2), .s(pin1), .out(pin8));
endmodule
