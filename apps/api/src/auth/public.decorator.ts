import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_ROUTE = 'cinewrapped:is-public';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_ROUTE, true);
