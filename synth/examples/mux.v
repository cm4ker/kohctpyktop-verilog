module root(input pin1, input pin2, input pin3, input pin4,
            input pin6, input pin7, output pin8);
    wire [3:0] data = {pin1, pin2, pin3, pin4};
    wire [1:0] sel = {pin7, pin6};
    assign pin8 = data[sel];
endmodule
