package graph

import "github.com/venturemate/vmbackend/internal/app"

var AppContainer *app.Container

func SetContainer(c *app.Container) {
	AppContainer = c
}
