import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceDashboardStatsDto {
  @ApiProperty({ example: 5 })
  openCards!: number;

  @ApiProperty({ example: 42 })
  closedCards!: number;

  @ApiProperty({ example: 12, description: 'Cards received today in Asia/Amman.' })
  todayReceived!: number;

  @ApiProperty({ example: 47 })
  totalCards!: number;
}

export class EntityDashboardStatsDto {
  @ApiProperty({ example: 120 })
  active!: number;

  @ApiProperty({ example: 135 })
  total!: number;
}

export class DashboardStatsResponseDto {
  @ApiProperty({ type: MaintenanceDashboardStatsDto })
  maintenance!: MaintenanceDashboardStatsDto;

  @ApiProperty({ type: EntityDashboardStatsDto })
  customers!: EntityDashboardStatsDto;

  @ApiProperty({ type: EntityDashboardStatsDto })
  vehicles!: EntityDashboardStatsDto;
}
