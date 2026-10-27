package main

import (
	"errors"
	"strings"
	"testing"
)

func TestRender(t *testing.T) {
	tests := []struct {
		name    string
		tmpl    string
		data    string
		want    string
		wantErr string
	}{
		{
			name: "refresh frequency renders as Sablier sends it",
			tmpl: `<meta http-equiv="refresh" content="{{ .RefreshFrequency }}">`,
			data: `{"RefreshFrequency": "5"}`,
			want: `<meta http-equiv="refresh" content="5">`,
		},
		{
			name: "empty data renders with zero values",
			tmpl: `<p>static</p>{{ .DisplayName }}`,
			data: "  \n",
			want: `<p>static</p>`,
		},
		{
			name: "instance error is falsy when null and printed when set",
			tmpl: `{{ range .InstanceStates }}{{ .Name }}:{{ if .Error }}{{ .Error }}{{ else }}ok{{ end }};{{ end }}`,
			data: `{"InstanceStates": [{"Name": "a", "Error": null}, {"Name": "b", "Error": "unhealthy"}]}`,
			want: `a:ok;b:unhealthy;`,
		},
		{
			name: "provider metadata is reachable with Sablier's field names",
			tmpl: `{{ range .InstanceStates }}{{ .Docker.Image }} {{ index .Docker.Labels "app" }}{{ end }}`,
			data: `{"InstanceStates": [{"Provider": "docker", "Docker": {"id": "abc", "image": "nginx:latest", "labels": {"app": "web"}}}]}`,
			want: `nginx:latest web`,
		},
		{
			// https://github.com/sablierapp/theme-editor/issues/1
			name: "replicas compare with integer literals",
			tmpl: `{{- range $i, $instance := .InstanceStates }}{{- if ( gt $instance.DesiredReplicas 1 ) }}{{ $instance.Name }}:ha;{{- else }}{{ $instance.Name }}:standalone;{{- end }}{{ end -}}`,
			data: `{"InstanceStates": [{"Name": "a", "DesiredReplicas": 1}, {"Name": "b", "DesiredReplicas": 4}]}`,
			want: `a:standalone;b:ha;`,
		},
		{
			name:    "misspelled field fails like it does in Sablier",
			tmpl:    `{{ .DisplayNam }}`,
			data:    `{}`,
			wantErr: "can't evaluate field DisplayNam",
		},
		{
			name:    "field Sablier does not provide is rejected",
			tmpl:    ``,
			data:    `{"ShowDetails": true}`,
			wantErr: `unknown field "ShowDetails"`,
		},
		{
			name:    "trailing data after the JSON object is rejected",
			tmpl:    ``,
			data:    `{} {}`,
			wantErr: "unexpected data after JSON",
		},
		{
			name:    "invalid template",
			tmpl:    `{{ .DisplayName `,
			data:    `{}`,
			wantErr: "error parsing template",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := render(tt.tmpl, tt.data)
			if tt.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("render() error = %v, want it to contain %q", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("render() error = %v", err)
			}
			if got != tt.want {
				t.Errorf("render() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestErrorPage(t *testing.T) {
	got := errorPage(errors.New(`at <.Foo.Bar>: can't evaluate field Bar`))
	if !strings.Contains(got, "at &lt;.Foo.Bar&gt;") {
		t.Errorf("errorPage() = %q, want the error HTML-escaped", got)
	}
}
