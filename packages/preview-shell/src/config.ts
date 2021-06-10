import { InjectionKey, Ref } from 'vue';
import { ComponentModule } from './types';

export const COMPONENTS: InjectionKey<Ref<ComponentModule[]>> = Symbol.for('preview::components');
export const ZOOM: InjectionKey<Ref<number>> = Symbol.for('preview::zoom');
export const THEME: InjectionKey<Ref<string>> = Symbol.for('preview::theme');
