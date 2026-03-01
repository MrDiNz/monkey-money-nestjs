import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LoanService } from './loan.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { PaginatedLoanDto } from './dto/paginated-loan.dto';
import { Loan } from './entities/loan.entity';

@ApiTags('loan')
@ApiBearerAuth()
@Controller('loan')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post()
  @ApiOperation({ summary: 'สร้างสัญญาพร้อม borrower, vehicle และ guarantors' })
  @ApiResponse({ status: 201, type: Loan })
  create(@Body() createLoanDto: CreateLoanDto): Promise<Loan> {
    return this.loanService.create(createLoanDto);
  }

  @Get()
  @ApiOperation({ summary: 'รายการสัญญา (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, type: PaginatedLoanDto })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<PaginatedLoanDto> {
    return this.loanService.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ดูสัญญา full detail' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiResponse({ status: 200, type: Loan })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  findOne(@Param('id') id: string): Promise<Loan> {
    return this.loanService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขสัญญา + nested data' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiResponse({ status: 200, type: Loan })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  update(
    @Param('id') id: string,
    @Body() updateLoanDto: UpdateLoanDto,
  ): Promise<Loan> {
    return this.loanService.update(+id, updateLoanDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ลบสัญญา (cascade)' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiResponse({ status: 200, description: 'Loan deleted' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.loanService.remove(+id);
  }
}
