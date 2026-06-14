package graph

import (
	"encoding/json"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/auth"
	"github.com/venturemate/vmbackend/internal/oauth"
	"github.com/venturemate/vmbackend/internal/subscriptions"
	"github.com/venturemate/vmbackend/internal/users"
)

var planFeatureType = graphql.NewObject(graphql.ObjectConfig{
	Name: "PlanFeature",
	Fields: graphql.Fields{
		"text":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"included": &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
	},
})

var planType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Plan",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"displayName":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"priceMonthly": &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"priceYearly":  &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"features": &graphql.Field{
			Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(planFeatureType))),
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				var featuresStr string
				switch v := p.Source.(type) {
				case *subscriptions.Plan:
					featuresStr = v.Features
				case subscriptions.Plan:
					featuresStr = v.Features
				default:
					return []map[string]interface{}{}, nil
				}
				var features []map[string]interface{}
				if err := json.Unmarshal([]byte(featuresStr), &features); err != nil {
					return []map[string]interface{}{}, nil
				}
				return features, nil
			},
		},
		"sortOrder": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"isActive":  &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
	},
})

var subscriptionType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Subscription",
	Fields: graphql.Fields{
		"id":                &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":            &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"plan":              &graphql.Field{Type: graphql.NewNonNull(planType)},
		"status":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"currentPeriodStart": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"currentPeriodEnd":  &graphql.Field{Type: graphql.String},
		"cancelAtPeriodEnd": &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
	},
})

var userType = graphql.NewObject(graphql.ObjectConfig{
	Name: "User",
	Fields: graphql.Fields{
		"id":             &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"firstName":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"surname":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"otherNames":     &graphql.Field{Type: graphql.String},
		"dob":            &graphql.Field{Type: graphql.String},
		"email":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"primaryPhone":   &graphql.Field{Type: graphql.String},
		"secondaryPhone": &graphql.Field{Type: graphql.String},
		"picture":        &graphql.Field{Type: graphql.String},
		"bio":            &graphql.Field{Type: graphql.String},
		"country":        &graphql.Field{Type: graphql.String},
		"city":           &graphql.Field{Type: graphql.String},
		"language":       &graphql.Field{Type: graphql.String},
		"linkedIn":       &graphql.Field{Type: graphql.String},
		"twitter":        &graphql.Field{Type: graphql.String},
		"website":        &graphql.Field{Type: graphql.String},
		"onboarded":          &graphql.Field{Type: graphql.Boolean},
		"status":             &graphql.Field{Type: graphql.String},
		"preferredCurrency":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var authPayloadType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AuthPayload",
	Fields: graphql.Fields{
		"token": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"user":  &graphql.Field{Type: userType},
	},
})

var rootQuery = graphql.NewObject(graphql.ObjectConfig{
	Name: "Query",
	Fields: graphql.Fields{
		"user": &graphql.Field{
			Type: userType,
			Args: graphql.FieldConfigArgument{
				"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				id := p.Args["id"].(string)
				return &users.User{ID: id}, nil
			},
		},
		"plans": &graphql.Field{
			Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(planType))),
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return []*subscriptions.Plan{}, nil
				}
				return AppContainer.SubscriptionRepo.GetAllPlans(p.Context)
			},
		},
		"mySettings": &graphql.Field{
			Type: graphql.String,
			Args: graphql.FieldConfigArgument{
				"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return "{}", nil
				}
				userID := p.Args["userId"].(string)
				settings, err := AppContainer.UserRepo.GetSettings(p.Context, userID)
				if err != nil {
					return "{}", nil
				}
				return settings, nil
			},
		},
		"mySubscription": &graphql.Field{
			Type: subscriptionType,
			Args: graphql.FieldConfigArgument{
				"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return nil, nil
				}
				userID := p.Args["userId"].(string)
				sub, _, err := AppContainer.SubscriptionRepo.GetUserSubscription(p.Context, userID)
				return sub, err
			},
		},
		"oAuthStatus": &graphql.Field{
			Type: graphql.String,
			Args: graphql.FieldConfigArgument{
				"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return "[]", nil
				}
				userID := p.Args["userId"].(string)
				tokens, err := AppContainer.OAuthRepo.ListTokens(p.Context, userID)
				if err != nil {
					return "[]", nil
				}
				type statusItem struct {
					Provider      string `json:"provider"`
					Connected     bool   `json:"connected"`
					ProviderEmail string `json:"providerEmail,omitempty"`
				}
				var items []statusItem
				for _, cfg := range oauth.ProviderConfigs {
					found := false
					for _, t := range tokens {
						if t.Provider == cfg.Name {
							items = append(items, statusItem{Provider: cfg.Name, Connected: true, ProviderEmail: t.ProviderEmail})
							found = true
							break
						}
					}
					if !found {
						items = append(items, statusItem{Provider: cfg.Name, Connected: false})
					}
				}
				b, _ := json.Marshal(items)
				return string(b), nil
			},
		},
		"exchangeRates": &graphql.Field{
			Type: graphql.NewNonNull(graphql.String),
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return "[]", nil
				}
				rates := AppContainer.RateService.List()
				b, _ := json.Marshal(rates)
				return string(b), nil
			},
		},
	},
})

var rootMutation = graphql.NewObject(graphql.ObjectConfig{
	Name: "Mutation",
	Fields: graphql.Fields{
		"signup": &graphql.Field{
			Type: authPayloadType,
			Args: graphql.FieldConfigArgument{
				"firstName": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"surname":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"email":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"password":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return nil, nil
				}
				firstName := p.Args["firstName"].(string)
				surname := p.Args["surname"].(string)
				email := p.Args["email"].(string)
				password := p.Args["password"].(string)

				token, user, err := auth.Signup(
					AppContainer.UserRepo,
					AppContainer.SubscriptionRepo,
					email, password, firstName, surname,
					AppContainer.JWTSecret,
				)
				if err != nil {
					return nil, err
				}
				return map[string]interface{}{"token": token, "user": user}, nil
			},
		},
		"login": &graphql.Field{
			Type: authPayloadType,
			Args: graphql.FieldConfigArgument{
				"email":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"password": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return nil, nil
				}
				email := p.Args["email"].(string)
				password := p.Args["password"].(string)
				token, user, err := auth.Login(AppContainer.UserRepo, AppContainer.SubscriptionRepo, email, password, AppContainer.JWTSecret)
				if err != nil {
					return nil, err
				}
				return map[string]interface{}{"token": token, "user": user}, nil
			},
		},
		"changePlan": &graphql.Field{
			Type: subscriptionType,
			Args: graphql.FieldConfigArgument{
				"userId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				"planName": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return nil, nil
				}
				userID := p.Args["userId"].(string)
				planName := p.Args["planName"].(string)
				sub, _, err := AppContainer.SubscriptionRepo.ChangePlan(p.Context, userID, planName)
				return sub, err
			},
		},
		"cancelSubscription": &graphql.Field{
			Type: graphql.Boolean,
			Args: graphql.FieldConfigArgument{
				"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return false, nil
				}
				userID := p.Args["userId"].(string)
				err := AppContainer.SubscriptionRepo.CancelSubscription(p.Context, userID)
				return err == nil, err
			},
		},
		"requestPasswordReset": &graphql.Field{
			Type: graphql.Boolean,
			Args: graphql.FieldConfigArgument{
				"email": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return false, nil
				}
				email := p.Args["email"].(string)
				return true, auth.RequestPasswordReset(AppContainer.UserRepo, AppContainer.OTPRepo, email)
			},
		},
		"updateProfile": &graphql.Field{
			Type: authPayloadType,
			Args: graphql.FieldConfigArgument{
				"userId":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				"firstName":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"surname":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"otherNames":     &graphql.ArgumentConfig{Type: graphql.String},
				"dob":            &graphql.ArgumentConfig{Type: graphql.String},
				"primaryPhone":   &graphql.ArgumentConfig{Type: graphql.String},
				"secondaryPhone": &graphql.ArgumentConfig{Type: graphql.String},
				"picture":        &graphql.ArgumentConfig{Type: graphql.String},
				"bio":            &graphql.ArgumentConfig{Type: graphql.String},
				"country":        &graphql.ArgumentConfig{Type: graphql.String},
				"city":           &graphql.ArgumentConfig{Type: graphql.String},
				"language":       &graphql.ArgumentConfig{Type: graphql.String},
				"linkedIn":       &graphql.ArgumentConfig{Type: graphql.String},
				"twitter":        &graphql.ArgumentConfig{Type: graphql.String},
				"website":           &graphql.ArgumentConfig{Type: graphql.String},
				"preferredCurrency": &graphql.ArgumentConfig{Type: graphql.String},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return nil, nil
				}
				userID := p.Args["userId"].(string)
				firstName := p.Args["firstName"].(string)
				surname := p.Args["surname"].(string)
				otherNames, _ := p.Args["otherNames"].(string)
				dob, _ := p.Args["dob"].(string)
				primaryPhone, _ := p.Args["primaryPhone"].(string)
				secondaryPhone, _ := p.Args["secondaryPhone"].(string)
				picture, _ := p.Args["picture"].(string)
				bio, _ := p.Args["bio"].(string)
				country, _ := p.Args["country"].(string)
				city, _ := p.Args["city"].(string)
				language, _ := p.Args["language"].(string)
				linkedIn, _ := p.Args["linkedIn"].(string)
				twitter, _ := p.Args["twitter"].(string)
				website, _ := p.Args["website"].(string)
				preferredCurrency, _ := p.Args["preferredCurrency"].(string)
				if preferredCurrency == "" {
					preferredCurrency = "USD"
				}
				token, user, err := auth.UpdateProfile(
					AppContainer.UserRepo, AppContainer.SubscriptionRepo,
					userID, AppContainer.JWTSecret,
					firstName, surname, otherNames, dob,
					primaryPhone, secondaryPhone, picture, bio, country, city, language,
					linkedIn, twitter, website, preferredCurrency,
				)
				if err != nil {
					return nil, err
				}
				return map[string]interface{}{"token": token, "user": user}, nil
			},
		},
		"changePassword": &graphql.Field{
			Type: graphql.Boolean,
			Args: graphql.FieldConfigArgument{
				"userId":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				"currentPassword": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"newPassword":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return false, nil
				}
				userID := p.Args["userId"].(string)
				currentPassword := p.Args["currentPassword"].(string)
				newPassword := p.Args["newPassword"].(string)
				err := auth.ChangePassword(AppContainer.UserRepo, userID, currentPassword, newPassword)
				return err == nil, err
			},
		},
		"updateSettings": &graphql.Field{
			Type: graphql.Boolean,
			Args: graphql.FieldConfigArgument{
				"userId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				"settings": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return false, nil
				}
				userID := p.Args["userId"].(string)
				settings := p.Args["settings"].(string)
				err := AppContainer.UserRepo.UpdateSettings(p.Context, userID, settings)
				return err == nil, err
			},
		},
		"resetPassword": &graphql.Field{
			Type: graphql.Boolean,
			Args: graphql.FieldConfigArgument{
				"email":           &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"otp":             &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"newPassword":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"confirmPassword": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return false, nil
				}
				email := p.Args["email"].(string)
				otp := p.Args["otp"].(string)
				newPass := p.Args["newPassword"].(string)
				confirm := p.Args["confirmPassword"].(string)
				return true, auth.ResetPassword(AppContainer.UserRepo, AppContainer.OTPRepo, email, otp, newPass, confirm)
			},
		},
		"disconnectOAuth": &graphql.Field{
			Type: graphql.Boolean,
			Args: graphql.FieldConfigArgument{
				"provider": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				"userId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if AppContainer == nil {
					return false, nil
				}
				userID := p.Args["userId"].(string)
				provider := p.Args["provider"].(string)
				if err := AppContainer.OAuthRepo.DeleteToken(p.Context, userID, provider); err != nil {
					return false, err
				}
				if err := AppContainer.OAuthManager.SyncConnectedAppsSetting(userID, provider, false); err != nil {
					return false, err
				}
				return true, nil
			},
		},
	},
})

var Schema, _ = graphql.NewSchema(graphql.SchemaConfig{
	Query:    rootQuery,
	Mutation: rootMutation,
})
