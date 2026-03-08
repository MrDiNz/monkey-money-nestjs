import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger'
import { PaymentService } from './payment.service'
import { CreatePaymentDto } from './dto/create-payment.dto'

@ApiTags('loan')
@ApiBearerAuth()
@Controller('loan')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':id/payment-summary')
  @ApiOperation({ summary: 'ยอดรวมที่ต้องชำระ (ค่าปรับ + ค่าผิดนัด + ค่างวด)' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiResponse({ status: 200, description: 'Payment summary' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  getPaymentSummary(@Param('id') id: string) {
    return this.paymentService.getPaymentSummary(+id)
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'รับชำระเงินค่างวด' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiResponse({ status: 201, description: 'Payment processed' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  processPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.paymentService.processPayment(+id, dto)
  }
}
