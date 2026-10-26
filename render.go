package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"html/template"
	"io"
	"strings"
)

// TemplateData mirrors github.com/sablierapp/sablier/pkg/theme.TemplateData,
// the data Sablier passes to a theme, so the preview behaves as Sablier would.
type TemplateData struct {
	DisplayName      string
	InstanceStates   []Instance
	SessionDuration  string
	RefreshFrequency string
	Version          string
}

// Instance mirrors github.com/sablierapp/sablier/pkg/theme.Instance.
type Instance struct {
	Name            string
	Status          string
	Error           *instanceError `json:",omitempty"`
	CurrentReplicas int32
	DesiredReplicas int32
	Provider        string
	Docker          *DockerContainerInfo    `json:",omitempty"`
	Swarm           *SwarmServiceInfo       `json:",omitempty"`
	Kubernetes      *KubernetesWorkloadInfo `json:",omitempty"`
	Podman          *PodmanContainerInfo    `json:",omitempty"`
}

// instanceError stands in for the error Sablier sets on Instance.Error,
// which JSON cannot decode into an interface.
type instanceError string

func (e instanceError) Error() string { return string(e) }

type DockerContainerInfo struct {
	ID     string            `json:"id"`
	Image  string            `json:"image"`
	Labels map[string]string `json:"labels,omitempty"`
}

type SwarmServiceInfo struct {
	ID     string            `json:"id"`
	Image  string            `json:"image"`
	Labels map[string]string `json:"labels,omitempty"`
}

type KubernetesWorkloadInfo struct {
	Namespace string            `json:"namespace"`
	Kind      string            `json:"kind"`
	Image     string            `json:"image"`
	Labels    map[string]string `json:"labels,omitempty"`
}

type PodmanContainerInfo struct {
	ID     string            `json:"id"`
	Image  string            `json:"image"`
	Labels map[string]string `json:"labels,omitempty"`
}

// render executes inputTmpl against inputData, a JSON encoded TemplateData.
func render(inputTmpl, inputData string) (string, error) {
	tmpl, err := template.New("base").Parse(inputTmpl)
	if err != nil {
		return "", fmt.Errorf("error parsing template: %w", err)
	}

	data, err := decode(inputData)
	if err != nil {
		return "", fmt.Errorf("error decoding data: %w", err)
	}

	var b strings.Builder
	if err := tmpl.Execute(&b, data); err != nil {
		return "", fmt.Errorf("error executing template: %w", err)
	}
	return b.String(), nil
}

// decode parses inputData, rejecting fields Sablier does not provide.
// Empty input yields the zero value.
func decode(inputData string) (TemplateData, error) {
	var data TemplateData
	if strings.TrimSpace(inputData) == "" {
		return data, nil
	}

	dec := json.NewDecoder(strings.NewReader(inputData))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&data); err != nil {
		return data, err
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) {
		return data, errors.New("unexpected data after JSON object")
	}
	return data, nil
}

// errorPage formats err as HTML, since the editor loads whatever the
// template function returns into the preview frame.
func errorPage(err error) string {
	return `<pre style="color:#b00020;white-space:pre-wrap">` + html.EscapeString(err.Error()) + `</pre>`
}
