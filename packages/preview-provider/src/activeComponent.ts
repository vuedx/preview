export interface ActiveComponent {
  name?: string;
  componentName: string;
}

let activeComponent: ActiveComponent = {
  componentName: '',
};

export function setActiveComponent(component: ActiveComponent): void {
  activeComponent = component;
}

export function getActiveComponent(): ActiveComponent {
  return activeComponent;
}
