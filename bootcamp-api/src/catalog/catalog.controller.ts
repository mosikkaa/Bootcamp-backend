import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  async categories() {
    const data = await this.catalog.categories();
    return { data };
  }

  @Get('topics')
  async topics() {
    const data = await this.catalog.topics();
    return { data };
  }

  @Get('instructors')
  async instructors() {
    const data = await this.catalog.instructors();
    return { data };
  }
}
