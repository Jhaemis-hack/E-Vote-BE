import { AuthGuard } from '../auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;
  beforeEach(() => {
    jwtService = new JwtService({ secret: 'test-secret' });
    reflector = new Reflector();
    authGuard = new AuthGuard(jwtService, reflector);
  });
  it('should allow access to public routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockExecutionContext();
    const result = await authGuard.canActivate(context);
    expect(result).toBe(true);
  });
  it('should throw UnauthorizedException if no token is provided', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockExecutionContext();
    context.switchToHttp().getRequest().headers.authorization = undefined;
    await expect(authGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
  it('should throw UnauthorizedException if token is invalid', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));
    const context = createMockExecutionContext();
    context.switchToHttp().getRequest().headers.authorization = 'Bearer invalid-token';
    await expect(authGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
  it('should throw UnauthorizedException if token is expired', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ exp: Math.floor(Date.now() / 1000) - 10 });
    const context = createMockExecutionContext();
    context.switchToHttp().getRequest().headers.authorization = 'Bearer expired-token';
    await expect(authGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
  it('should allow access if token is valid', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ exp: Math.floor(Date.now() / 1000) + 1000 });
    const context = createMockExecutionContext();
    context.switchToHttp().getRequest().headers.authorization = 'Bearer valid-token';
    const result = await authGuard.canActivate(context);
    expect(result).toBe(true);
  });
  function createMockExecutionContext(): ExecutionContext {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {
            authorization: 'Bearer test-token',
          },
        }),
      }),
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(() => {}),
    } as unknown as ExecutionContext;
  }
});
