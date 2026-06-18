import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  async categories() {
    return this.catalog.categories();
  }

  @Get('topics')
  async topics() {
    return this.catalog.topics();
  }

  @Get('instructors')
  async instructors() {
    return this.catalog.instructors();
  }
}
