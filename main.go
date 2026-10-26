//go:build js && wasm

package main

import (
	"errors"
	"syscall/js"
)

func main() {
	// template takes in a template string and JSON input data and returns
	// the rendered output, or an HTML page describing the error.
	js.Global().Set("template", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) != 2 || args[0].Type() != js.TypeString || args[1].Type() != js.TypeString {
			return errorPage(errors.New("must provide exactly two string arguments: inputTmpl, inputData"))
		}

		output, err := render(args[0].String(), args[1].String())
		if err != nil {
			return errorPage(err)
		}
		return output
	}))
	// Wait forever
	select {}
}
