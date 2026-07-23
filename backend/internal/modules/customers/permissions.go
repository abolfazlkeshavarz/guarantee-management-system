package customers

// Permission constants for customers module
const (
	PermViewCustomers   = "customers.view"
	PermCreateCustomer  = "customers.create"
	PermEditCustomer    = "customers.edit"
	PermDeleteCustomer  = "customers.delete"
	PermExportCustomers = "customers.export"
)

// RolePermissions defines which roles have which permissions
var RolePermissions = map[string][]string{
	"admin": {
		PermViewCustomers,
		PermCreateCustomer,
		PermEditCustomer,
		PermDeleteCustomer,
		PermExportCustomers,
	},
	"technician": {
		PermViewCustomers,
	},
}