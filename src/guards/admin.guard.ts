//TODO:
// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// // import { user } from 'src/modules/user/entities/user.entity';

// @Injectable()
// export class AdminGuard implements CanActivate {
//   canActivate(context: ExecutionContext): boolean {
//     const request = context.switchToHttp().getRequest();
//     const user = request.user;

//     // Allow access only if a user is attached and has an admin user_type
//     return Boolean(user && user.user_type === user.Admin);
//   }
// }
