import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '@/core/auth/public.decorator';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User logged in successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto);
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User logged out successfully.' })
  logout() {
    // In a real application, you would implement a token blocklist here.
    // For example, using Redis to store revoked tokens until they expire.
    return { message: 'Logged out successfully' };
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Return the user profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@Request() req: { user: { userId: number; username: string } }) {
    return req.user;
  }

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Return all users.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll() {
    return this.userService.findAll();
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', description: 'The user id', type: 'integer' })
  @ApiResponse({ status: 200, description: 'Return the user.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'The user id', type: 'integer' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'The user id', type: 'integer' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
