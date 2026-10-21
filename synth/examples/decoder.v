module root(input pin2, input pin3,
            output pin5, output pin6, output pin7, output pin8);
    wire [1:0] sel = {pin2, pin3};
    assign {pin8, pin7, pin6, pin5} = 4'b1 << sel;
endmodule
